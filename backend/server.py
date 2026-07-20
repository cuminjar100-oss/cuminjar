from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import io
import json
import re
import base64
import uuid
import logging
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from supabase_client import is_supabase_configured
from dev_phone_auth import router as dev_phone_auth_router

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")
# Indian language codes Sarvam excels at — used to decide whether to keep Sarvam's
# transcript or fall back to Whisper (which handles non-Indian languages better).
SARVAM_INDIAN_LANGUAGES = {
    "ta-IN", "hi-IN", "te-IN", "kn-IN", "ml-IN", "bn-IN",
    "gu-IN", "mr-IN", "pa-IN", "od-IN", "en-IN",
}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ===================== Models =====================
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str = ""
    name: str
    mobile: Optional[str] = None
    created_at: Optional[str] = None


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _validate_email(s: str) -> str:
    s = (s or "").strip().lower()
    if not EMAIL_RE.match(s):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    return s


class InviteEmailIn(BaseModel):
    email: str
    vault_name: str
    accept_url: str


# ===================== Entry types =====================
# Mamascript captures more than recipes — rituals, festivals, songs/blessings, and
# (legacy) recipes. The entry_type drives both the Claude structuring prompt and the
# UI rendering. All four share the same audio + translation pipeline.
ENTRY_TYPES = {"recipe", "ritual", "festival", "song"}


def _bearer_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


async def get_current_user(request: Request) -> User:
    tok = _bearer_token(request)
    if not tok:
        raise HTTPException(status_code=401, detail="Not authenticated")

    from supabase_auth import user_from_supabase_token

    supabase_payload = user_from_supabase_token(tok)
    if supabase_payload:
        return User(**supabase_payload)

    raise HTTPException(status_code=401, detail="Not authenticated")


@api_router.get("/auth/me", response_model=User)
async def me(user: User = Depends(get_current_user)):
    return user


api_router.include_router(dev_phone_auth_router)


# ===================== Cookbook helpers =====================
async def _membership(vault_id: str, user_id: str) -> Optional[dict]:
    from supabase_store import get_membership
    return get_membership(vault_id, user_id)


async def _require_member(vault_id: str, user: User) -> dict:
    m = await _membership(vault_id, user.user_id)
    if not m:
        raise HTTPException(status_code=403, detail="You're not a member of this vault")
    return m


@api_router.post("/invites/send-email")
async def send_invite_email(payload: InviteEmailIn, user: User = Depends(get_current_user)):
    """Send invitation email via Resend (vault data lives in Supabase)."""
    from email_service import send_invitation_email
    email = _validate_email(payload.email)
    result = await send_invitation_email(
        to_email=email,
        vault_name=payload.vault_name,
        inviter_name=user.name,
        accept_url=payload.accept_url,
    )
    return result


# ===================== Audio + AI entries =====================
@api_router.post("/vaults/{vault_id}/entries/audio")
async def create_entry_from_audio(
    vault_id: str,
    audio: UploadFile = File(...),
    title: str = Form(...),
    entry_type: str = Form("recipe"),
    language_hint: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
):
    await _require_member(vault_id, user)
    if entry_type not in ENTRY_TYPES:
        raise HTTPException(status_code=400, detail=f"Unknown entry type '{entry_type}'. Valid types: {sorted(ENTRY_TYPES)}")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="The recording came through empty")
    if len(audio_bytes) > 24 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Recording is too long — please keep it under ~10 minutes")

    mime_type = audio.content_type or "audio/webm"
    ext_map = {
        "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp3": "mp3",
        "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/m4a": "m4a", "audio/aac": "m4a",
        "audio/wav": "wav", "audio/x-wav": "wav", "audio/flac": "flac",
    }
    ext = ext_map.get(mime_type.split(";")[0].strip(), "webm")

    # 1) Transcribe — Sarvam Saaras-v3 for Indian languages (best accuracy with
    #    chunk-level timestamps); if it rate-limits or fails, fall back to Whisper.
    #    For Whisper, we pass a language hint when we can detect one — this dramatically
    #    reduces hallucination loops on Indian speech.
    segments: List[Dict[str, Any]] = []
    segments_en: Optional[List[Dict[str, Any]]] = None
    transcript_text = ""
    detected_language: Optional[str] = None
    duration: Optional[float] = None
    transcriber = "whisper"

    sarvam_result = await _sarvam_transcribe(audio_bytes, mime_type)
    if sarvam_result and sarvam_result["language_code"] in SARVAM_INDIAN_LANGUAGES:
        segments = sarvam_result["segments"]
        # Use Sarvam's own English translation segments — guaranteed transcription-faithful.
        # Falling back to None lets the LLM stage know to translate via Claude as before.
        segments_en = sarvam_result.get("segments_en") or None
        transcript_text = sarvam_result["transcript"]
        detected_language = sarvam_result["language_code"]
        duration = sarvam_result.get("duration")
        transcriber = "sarvam"
    else:
        # If Sarvam at least detected the language from one chunk before bailing, use it as hint.
        # User-supplied hint takes precedence over auto-detection.
        whisper_lang_hint = (language_hint or "").strip().lower() or None
        if not whisper_lang_hint and sarvam_result:
            iso = sarvam_result.get("language_code") or ""
            whisper_lang_hint = iso.split("-")[0].lower() or None
        try:
            from emergentintegrations.llm.openai import OpenAISpeechToText
            stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
            buf = io.BytesIO(audio_bytes)
            buf.name = f"recording.{ext}"
            stt_resp = await stt.transcribe(
                file=buf, model="whisper-1",
                response_format="verbose_json",
                timestamp_granularities=["segment"], temperature=0.0,
                language=whisper_lang_hint,
                prompt="A home cook is narrating a recipe step by step.",
            )
        except Exception as e:
            logger.exception("Whisper failed")
            raise HTTPException(status_code=502, detail=f"Could not transcribe the recording: {e}")
        transcript_text = getattr(stt_resp, "text", "") or ""
        detected_language = getattr(stt_resp, "language", None)
        duration = getattr(stt_resp, "duration", None)
        segments_raw = getattr(stt_resp, "segments", []) or []
        # Whisper segments come back as dicts (NOT objects) via emergentintegrations.
        # Support both shapes defensively so we never silently lose timestamps again.
        for s in segments_raw:
            try:
                start = s["start"] if isinstance(s, dict) else getattr(s, "start", 0)
                end = s["end"] if isinstance(s, dict) else getattr(s, "end", 0)
                text = s["text"] if isinstance(s, dict) else getattr(s, "text", "")
                segments.append({"start": float(start or 0), "end": float(end or 0), "text": str(text or "")})
            except Exception:
                continue
    logger.info(f"Transcribed via {transcriber}: lang={detected_language}, {len(segments)} segments, {len(transcript_text)} chars")

    # 2) Claude Sonnet 4.5: translate-then-structure with deterministic timestamps,
    #    branching by entry_type so a song doesn't get turned into a recipe card.
    structured = await _structure_recipe_with_llm(
        title=title.strip() or "Untitled entry",
        transcript=transcript_text, segments=segments, language=detected_language,
        entry_type=entry_type, segments_en=segments_en,
    )

    # 3) Save audio + entry FIRST, then attach the image (so a generation crash never
    #    leaves an orphan record, and an entry-insert crash never wastes an image gen).
    from supabase_store import insert_entry, store_entry_audio, update_entry as sb_update_entry
    from supabase_store import list_vault_member_ids, get_vault as sb_get_vault, create_notification as sb_notify

    now = datetime.now(timezone.utc).isoformat()
    entry_id = str(uuid.uuid4())
    entry = {
        "entry_id": entry_id, "vault_id": vault_id,
        "entry_type": entry_type,
        "title": structured.get("title") or title.strip() or "Untitled entry",
        "description": structured.get("description") or "",
        "steps": structured.get("steps") or [],
        "image_url": None,
        "notes": structured.get("notes") or "",
        "has_audio": True,
        "audio_duration": duration,
        "original_language": detected_language,
        "created_by_user_id": user.user_id,
        "created_by_name": user.name,
        "created_at": now, "updated_at": now,
        "ingredients": structured.get("ingredients") or [],
        "prep_time": structured.get("prep_time"),
        "cook_time": structured.get("cook_time"),
        "servings": structured.get("servings"),
        "occasion": structured.get("occasion"),
        "items_needed": structured.get("items_needed") or [],
        "participants": structured.get("participants"),
        "significance": structured.get("significance"),
        "time_of_year": structured.get("time_of_year"),
        "language": structured.get("language"),
        "lyrics_original": structured.get("lyrics_original"),
        "lyrics_english": structured.get("lyrics_english"),
        "when_sung": structured.get("when_sung"),
    }

    audio_path = store_entry_audio(entry_id, audio_bytes, mime_type)
    entry["audio_path"] = audio_path
    entry = insert_entry(entry)

    # 4) For recipes only, generate a dish photo.
    if entry_type == "recipe":
        image_url = await _generate_recipe_image(
            title=entry["title"], description=entry["description"],
            ingredients=entry["ingredients"], entry_id=entry_id,
        )
        if image_url:
            entry = sb_update_entry(entry_id, {"image_url": image_url}) or entry
            entry["image_url"] = image_url

    # Notify other members
    cb = sb_get_vault(vault_id)
    for uid in list_vault_member_ids(vault_id):
        if uid == user.user_id:
            continue
        sb_notify(
            user_id=uid, title="new_entry",
            body=f"{user.name} added \"{entry['title']}\" to {cb['name'] if cb else 'the vault'}",
            entry_id=entry_id, link=f"/entries/{entry_id}",
        )

    return entry


@api_router.get("/entries/{entry_id}/audio")
async def get_entry_audio(entry_id: str):
    from supabase_store import get_entry as sb_get_entry, download_bytes, parse_sb_url, AUDIO_BUCKET
    entry = sb_get_entry(entry_id)
    if not entry or not entry.get("audio_path"):
        raise HTTPException(status_code=404, detail="No audio for this recipe")
    bucket, path = parse_sb_url(entry["audio_path"])
    if not path:
        bucket, path = AUDIO_BUCKET, f"{entry_id}/recording.webm"
    data_bytes = download_bytes(bucket or AUDIO_BUCKET, path)
    if not data_bytes:
        raise HTTPException(status_code=404, detail="No audio for this recipe")
    return StreamingResponse(io.BytesIO(data_bytes), media_type="audio/webm")


@api_router.get("/entries/{entry_id}/image")
async def get_entry_image(entry_id: str):
    from supabase_store import get_entry as sb_get_entry, download_bytes, parse_sb_url, IMAGE_BUCKET
    entry = sb_get_entry(entry_id)
    if not entry or not entry.get("image_url"):
        raise HTTPException(status_code=404, detail="No image for this recipe")
    img_url = entry["image_url"]
    if img_url.startswith("/api/"):
        bucket, path = IMAGE_BUCKET, f"{entry_id}/main.png"
    else:
        bucket, path = parse_sb_url(img_url)
        if not path:
            bucket, path = IMAGE_BUCKET, img_url.split("/", 1)[-1] if "/" in img_url else f"{entry_id}/main.png"
    data_bytes = download_bytes(bucket or IMAGE_BUCKET, path)
    if not data_bytes:
        raise HTTPException(status_code=404, detail="No image for this recipe")
    return StreamingResponse(
        io.BytesIO(data_bytes),
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"},
    )


async def _require_entry_editor(entry_id: str, user: User) -> Dict[str, Any]:
    from supabase_store import get_entry as sb_get_entry
    r = sb_get_entry(entry_id)
    if not r:
        raise HTTPException(status_code=404, detail="Recipe not found")
    m = await _require_member(r["vault_id"], user)
    if r["created_by_user_id"] != user.user_id and m["role"] != "owner":
        raise HTTPException(status_code=403, detail="Only the entry author or vault creator can do this")
    return r


@api_router.post("/entries/{entry_id}/image/upload")
async def upload_entry_image(
    entry_id: str,
    image: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """The entry author or vault owner uploads their own dish photo, replacing any existing one."""
    await _require_entry_editor(entry_id, user)
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The image was empty")
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image is too large — please use one under 8 MB")
    mime = (image.content_type or "image/jpeg").split(";")[0].strip()
    if mime not in {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"}:
        raise HTTPException(status_code=415, detail=f"Unsupported image type: {mime}")
    from supabase_store import store_entry_image, update_entry as sb_update_entry
    ext = "jpg" if "jpeg" in mime or "jpg" in mime else "png"
    new_url = store_entry_image(entry_id, raw, mime, f"main.{ext}")
    sb_update_entry(entry_id, {"image_url": new_url})
    return {"ok": True, "image_url": new_url}


@api_router.post("/entries/{entry_id}/image/generate")
async def regenerate_entry_image(entry_id: str, user: User = Depends(get_current_user)):
    """Regenerate the dish photo with Gemini Nano Banana, replacing the existing one."""
    r = await _require_entry_editor(entry_id, user)
    from supabase_store import update_entry as sb_update_entry
    new_url = await _generate_recipe_image(
        title=r.get("title") or "Untitled recipe",
        description=r.get("description") or "",
        ingredients=r.get("ingredients") or [],
        entry_id=entry_id,
    )
    if not new_url:
        raise HTTPException(status_code=502, detail="Image generation failed — please try again in a moment")
    sb_update_entry(entry_id, {"image_url": new_url})
    return {"ok": True, "image_url": new_url}


@api_router.get("/vaults/{vault_id}/pdf")
async def vault_pdf(vault_id: str, user: User = Depends(get_current_user)):
    """Generate a printable, shareable PDF of the entire vault."""
    from supabase_store import get_vault as sb_get_vault, list_vault_entries, count_vault_entries
    await _require_member(vault_id, user)
    PDF_MAX = 100
    cb_row = sb_get_vault(vault_id)
    if not cb_row:
        raise HTTPException(status_code=404, detail="Cookbook not found")
    cb = {**cb_row, "my_role": ((await _membership(vault_id, user.user_id)) or {}).get("role")}
    total = count_vault_entries(vault_id)
    entries = list_vault_entries(vault_id, limit=PDF_MAX)
    if total > PDF_MAX:
        logger.info(f"PDF capped: vault {vault_id} has {total} entries, exporting first {PDF_MAX}")

    from cookbook_pdf import build_cookbook_pdf
    pdf_bytes = build_cookbook_pdf(cb, entries)
    safe_name = re.sub(r"[^A-Za-z0-9 _-]+", "", cb.get("name") or "mamascript").strip().replace(" ", "_")
    filename = f"{safe_name or 'mamascript'}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Entry-Total": str(total),
            "X-Entry-Exported": str(len(entries)),
        },
    )


# ===================== Sarvam AI transcription =====================
async def _sarvam_transcribe(audio_bytes: bytes, mime_type: str) -> Optional[Dict[str, Any]]:
    """Transcribe audio with Sarvam AI Saaras v3. Splits long audio into 25-second
    chunks with ffmpeg/pydub, transcribes each, and stitches segments back with the
    correct timestamps. Returns None if the API isn't configured or the call fails."""
    if not SARVAM_API_KEY:
        return None
    try:
        from pydub import AudioSegment  # noqa: WPS433 — lazy import
        import httpx  # noqa: WPS433
    except Exception as e:
        logger.warning(f"Sarvam dependencies missing: {e}")
        return None

    # Load audio into pydub (handles webm, mp4, ogg, wav, mp3 via ffmpeg)
    ext_for_pydub = {
        "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "mp4",
        "audio/x-m4a": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav",
        "audio/x-wav": "wav", "audio/flac": "flac",
    }
    main_mime = (mime_type or "audio/webm").split(";")[0].strip()
    fmt = ext_for_pydub.get(main_mime, None)
    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=fmt) if fmt else AudioSegment.from_file(io.BytesIO(audio_bytes))
    except Exception as e:
        logger.warning(f"pydub couldn't decode audio for Sarvam: {e}")
        return None

    duration_sec = len(audio) / 1000.0
    # Sarvam REST hard-limits to 30s, and its free-tier rate limit (~2 req/10s burst)
    # makes small chunks impractical. We use 22s chunks — enough granularity that a
    # typical 5-7 step recipe spans 4-6 chunks → each step maps to a usable audio window,
    # while staying within rate limits.
    chunk_ms = 22_000
    chunks: List[tuple[float, "AudioSegment"]] = []
    if duration_sec * 1000 <= chunk_ms:
        chunks.append((0.0, audio))
    else:
        for start_ms in range(0, len(audio), chunk_ms):
            chunks.append((start_ms / 1000.0, audio[start_ms:start_ms + chunk_ms]))

    all_segments: List[Dict[str, Any]] = []
    detected_languages: List[str] = []
    full_transcript_parts: List[str] = []
    endpoint = "https://api.sarvam.ai/speech-to-text"
    headers = {"api-subscription-key": SARVAM_API_KEY}

    # Sarvam free tier rate-limits aggressively → sequential with a tiny inter-request gap
    # is more reliable than parallel + 429-retry. A 2-min recording takes ~25s here.
    import asyncio  # noqa: WPS433

    async def _sarvam_call(http: "httpx.AsyncClient", wav_bytes: bytes, mode: Optional[str], offset_sec: float):
        """Single Sarvam request. mode=None → transcribe (original lang). mode='translate' → English."""
        data = {"model": "saaras:v3", "with_timestamps": "true"}
        if mode == "translate":
            data["mode"] = "translate"
        else:
            data["language_code"] = "unknown"
        for attempt in range(4):
            files = {"file": ("chunk.wav", wav_bytes, "audio/wav")}
            try:
                resp = await http.post(endpoint, headers=headers, files=files, data=data)
            except Exception as e:
                logger.warning(f"Sarvam ({mode or 'transcribe'}) @ {offset_sec:.1f}s network error: {e}")
                return None
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 429:
                delay = 0.8 * (2 ** attempt)
                logger.info(f"Sarvam 429 ({mode or 'transcribe'}) at {offset_sec:.1f}s — retrying in {delay:.1f}s (attempt {attempt+1}/4)")
                await asyncio.sleep(delay)
                continue
            logger.warning(f"Sarvam ({mode or 'transcribe'}) @ {offset_sec:.1f}s returned {resp.status_code}: {resp.text[:200]}")
            return None
        logger.warning(f"Sarvam ({mode or 'transcribe'}) @ {offset_sec:.1f}s gave up after 4 attempts (still 429)")
        return None

    async def _transcribe_one(http: "httpx.AsyncClient", offset_sec: float, chunk: "AudioSegment"):
        """Run BOTH transcribe (original lang) and translate (English) for one chunk in parallel.
        Returns (offset_sec, chunk, transcribe_body, translate_body) — either body may be None."""
        wav_buf = io.BytesIO()
        chunk.set_frame_rate(16000).set_channels(1).export(wav_buf, format="wav")
        wav_buf.seek(0)
        wav_bytes = wav_buf.read()
        tr_body, en_body = await asyncio.gather(
            _sarvam_call(http, wav_bytes, None, offset_sec),
            _sarvam_call(http, wav_bytes, "translate", offset_sec),
        )
        if tr_body is None and en_body is None:
            return None
        return (offset_sec, chunk, tr_body, en_body)

    results = []
    async with httpx.AsyncClient(timeout=60.0) as http:
        for idx, (off, ch) in enumerate(chunks):
            res = await _transcribe_one(http, off, ch)
            results.append(res)
            # Small breathing room between requests to respect free-tier rate limits
            if idx < len(chunks) - 1:
                await asyncio.sleep(0.25)

    successful = [r for r in results if r is not None]
    if not successful:
        # Total failure
        return None
    if len(successful) < len(results):
        # Partial — if we lost ≥40% of chunks, treat as failure and fall back to Whisper
        loss = 1 - (len(successful) / len(results))
        if loss >= 0.4:
            logger.warning(f"Sarvam lost {loss:.0%} of chunks — falling back to Whisper")
            # Still gather any detected language so Whisper gets a hint
            for r in successful:
                _, _, tr_body, en_body = r
                body = tr_body or en_body or {}
                lc = body.get("language_code") or body.get("language")
                if lc:
                    detected_languages.append(lc)
            if detected_languages:
                from collections import Counter
                return {"transcript": "", "transcript_en": "", "language_code": Counter(detected_languages).most_common(1)[0][0],
                        "segments": [], "segments_en": [], "duration": duration_sec, "partial": True}
            return None
        logger.info(f"Sarvam: {len(successful)}/{len(results)} chunks succeeded — proceeding")

    all_segments_en: List[Dict[str, Any]] = []
    full_transcript_en_parts: List[str] = []
    for offset_sec, chunk, tr_body, en_body in successful:
        chunk_dur = len(chunk) / 1000.0
        # Original-language transcript (Tamil/Hindi/etc.) — for archival & song lyrics_original
        if tr_body:
            chunk_lang = tr_body.get("language_code") or tr_body.get("language")
            chunk_text = (tr_body.get("transcript") or "").strip()
            if chunk_lang:
                detected_languages.append(chunk_lang)
            if chunk_text:
                full_transcript_parts.append(chunk_text)
            all_segments.append({
                "start": offset_sec,
                "end": offset_sec + chunk_dur,
                "text": chunk_text,
            })
        else:
            all_segments.append({"start": offset_sec, "end": offset_sec + chunk_dur, "text": ""})

        # Faithful English translation — bypasses Claude Stage 1 entirely, which was
        # prone to "helpful" ingredient hallucination (e.g. adding coriander seeds to
        # mor kuzhambu because the dish "usually" has them). Sarvam translate is
        # transcription-faithful — it never invents items.
        if en_body:
            en_lang = en_body.get("language_code") or en_body.get("language")
            en_text = (en_body.get("transcript") or "").strip()
            if en_lang and not tr_body:  # fallback lang signal if transcribe call failed
                detected_languages.append(en_lang)
            if en_text:
                full_transcript_en_parts.append(en_text)
            all_segments_en.append({
                "start": offset_sec,
                "end": offset_sec + chunk_dur,
                "text": en_text,
            })
        else:
            all_segments_en.append({"start": offset_sec, "end": offset_sec + chunk_dur, "text": ""})

    have_any_text = bool(full_transcript_parts) or bool(full_transcript_en_parts)
    if not have_any_text:
        # All chunks failed (likely rate-limited). Still bubble up the language if we got
        # one — Whisper can use it as a hint to avoid hallucination loops.
        if detected_languages:
            from collections import Counter
            return {
                "transcript": "",
                "transcript_en": "",
                "language_code": Counter(detected_languages).most_common(1)[0][0],
                "segments": [],
                "segments_en": [],
                "duration": duration_sec,
                "partial": True,
            }
        return None

    # Pick the dominant language across chunks
    from collections import Counter
    lang = Counter(detected_languages).most_common(1)[0][0] if detected_languages else None

    return {
        "transcript": " ".join(full_transcript_parts).strip(),
        "transcript_en": " ".join(full_transcript_en_parts).strip(),
        "language_code": lang,
        "segments": all_segments,
        "segments_en": all_segments_en,
        "duration": duration_sec,
    }


# ===================== LLM structuring =====================
async def _translate_segments_to_english(
    segments: List[Dict[str, Any]], source_language: Optional[str],
) -> List[Dict[str, Any]]:
    """Stage 1: Translate each transcript segment to fluent English using Claude Sonnet 4.5.
    Returns segments with the same start/end timing but English text. If the source
    language is already English (en, en-IN) returns segments unchanged."""
    if not segments:
        return segments
    src = (source_language or "").lower().strip()
    if src in {"en", "en-in", "en-us", "english"}:
        return segments
    logger.info(f"Translating {len(segments)} segments from {source_language!r} to English with Claude Sonnet 4.5")

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    numbered = "\n".join(f"[{i}] {s['text']}" for i, s in enumerate(segments))
    system_message = (
        "You are a faithful translator of spoken recipes. The user will send you a list of "
        "numbered transcript segments (one utterance per line). Your job is to translate each "
        "segment into natural, fluent English while preserving EVERY meaningful detail.\n\n"
        "RULES:\n"
        "- Translate each numbered segment independently. Do not merge, split, summarize, or skip lines.\n"
        "- Output EXACTLY one line per input segment, prefixed with the same [N] index.\n"
        "- Translate every word — do not paraphrase, do not infer, do not add cookbook flourishes.\n"
        "- Keep authentic cultural ingredient names (e.g. 'besan', 'garam masala', 'tuvar dal', 'kuzhambu'), "
        "  and add the English equivalent in parentheses on first mention only (e.g. 'besan (chickpea flour)').\n"
        "- Preserve regional dish names exactly — never anglicize them.\n"
        "- If a segment has no usable speech (just noise), output the [N] index followed by an empty string.\n"
        "- Do NOT output any other commentary or markdown. Just one '[N] english text' per line."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translate-{uuid.uuid4().hex[:8]}",
        system_message=system_message,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        raw = await chat.send_message(UserMessage(text=f"Source language: {source_language or 'unknown'}\n\nSegments:\n{numbered}"))
    except Exception as e:
        logger.exception(f"Translation pass failed: {e}")
        # Fall back: return original segments — structuring stage can still polish them.
        return segments

    raw_str = raw if isinstance(raw, str) else str(raw)
    out = {i: "" for i in range(len(segments))}
    # Accept multiple line shapes Claude might emit, e.g.:
    #   [3] Heat oil in a pan.
    #   3) Heat oil in a pan.
    #   3. Heat oil in a pan.
    #   3: Heat oil in a pan.
    line_re = re.compile(r"^\s*(?:\[\s*(\d+)\s*\]|(\d+))\s*[\].):\-]?\s*(.*)$")
    parsed_lines = 0
    for line in raw_str.splitlines():
        m = line_re.match(line)
        if not m:
            continue
        idx_str = m.group(1) or m.group(2)
        try:
            idx = int(idx_str)
        except (TypeError, ValueError):
            continue
        if 0 <= idx < len(segments):
            out[idx] = m.group(3).strip()
            parsed_lines += 1
    logger.info(f"Translation: parsed {parsed_lines}/{len(segments)} lines from Claude response (raw length={len(raw_str)})")
    if parsed_lines == 0:
        logger.warning(f"Translation parser found 0 lines. Sample response: {raw_str[:400]!r}")

    translated: List[Dict[str, Any]] = []
    for i, seg in enumerate(segments):
        translated.append({
            "start": seg["start"], "end": seg["end"],
            "text": out.get(i) or seg["text"],  # keep original if a line went missing
        })
    return translated


async def _structure_recipe_with_llm(
    title: str, transcript: str, segments: List[Dict[str, Any]], language: Optional[str],
    entry_type: str = "recipe", segments_en: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Two-stage Claude Sonnet 4.5 pipeline:
      Stage 1: Per-segment translation (preserves Whisper/Sarvam timestamps deterministically).
               SKIPPED if `segments_en` is supplied — Sarvam's translate mode is more faithful
               than re-translating via Claude (Claude tends to "helpfully" complete partial
               ingredient lists with what the dish "usually" has).
      Stage 2: Structure the English transcript into a Mamascript entry of the given type.
    Step timestamps are computed in Python from `from_indices`, NOT made up by the LLM."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    # ---- Stage 1: translate every segment to English ----
    if segments_en is not None and any((s.get("text") or "").strip() for s in segments_en):
        # Already translated by Sarvam — use it verbatim
        en_segments = segments_en
        logger.info(f"Using Sarvam-translated English ({len(en_segments)} segments) — skipping Claude Stage 1")
    else:
        en_segments = await _translate_segments_to_english(segments, language)
    en_transcript = " ".join(s["text"] for s in en_segments if s["text"]).strip() or transcript

    # ---- Stage 2: structure into an entry, prompt branches by type ----
    sys_msg, schema_hint, fallback_extra = _system_prompt_for_entry_type(entry_type)
    numbered_en = "\n".join(f"[{i}] ({s['start']:.1f}s–{s['end']:.1f}s) {s['text']}" for i, s in enumerate(en_segments))
    user_text = (
        f"User-provided title: {title}\n"
        f"Entry type: {entry_type}\n"
        f"Original spoken language: {language or 'unknown'}\n\n"
        f"English transcript segments (numbered, with timestamps for reference):\n"
        f"{numbered_en}\n\n"
        f"Return JSON matching this exact shape:\n{schema_hint}"
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"entry-{uuid.uuid4().hex[:8]}",
        system_message=sys_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    def _fallback(reason: str) -> Dict[str, Any]:
        base = {
            "title": title,
            "description": "",
            "steps": [{
                "text": en_transcript or transcript or "(transcript unavailable)",
                "start_time": en_segments[0]["start"] if en_segments else None,
                "end_time": en_segments[-1]["end"] if en_segments else None,
            }],
            "notes": f"(We saved the recording but couldn't auto-structure it: {reason}. Edit if you'd like.)",
        }
        base.update(fallback_extra)
        return base

    try:
        raw = await chat.send_message(UserMessage(text=user_text))
    except Exception as e:
        logger.exception("Claude structuring failed")
        return _fallback(str(e)[:120])

    raw_str = raw if isinstance(raw, str) else str(raw)
    cleaned = re.sub(r"^```(?:json)?|```$", "", raw_str.strip(), flags=re.MULTILINE).strip()
    try:
        data = json.loads(cleaned)
    except Exception:
        m = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not m:
            return _fallback("unparseable response")
        try:
            data = json.loads(m.group(0))
        except Exception:
            return _fallback("unparseable JSON")

    # Build steps with DETERMINISTIC timestamps from the from_indices list
    steps: List[Dict[str, Any]] = []
    for s in data.get("steps") or []:
        if isinstance(s, str):
            steps.append({"text": s.strip(), "start_time": None, "end_time": None})
            continue
        if not isinstance(s, dict):
            continue
        text = str(s.get("text") or "").strip()
        if not text:
            continue
        indices = s.get("from_indices") or []
        valid = [i for i in indices if isinstance(i, int) and 0 <= i < len(en_segments)]
        if valid:
            start_time = min(en_segments[i]["start"] for i in valid)
            end_time = max(en_segments[i]["end"] for i in valid)
        else:
            start_time = None
            end_time = None
        steps.append({"text": text, "start_time": start_time, "end_time": end_time})

    if not steps:
        steps = [{
            "text": en_transcript or transcript or "(We saved your recording but couldn't hear any words.)",
            "start_time": en_segments[0]["start"] if en_segments else None,
            "end_time": en_segments[-1]["end"] if en_segments else None,
        }]

    # Build the type-aware response payload
    result: Dict[str, Any] = {
        "title": str(data.get("title") or title).strip() or title,
        "description": str(data.get("description") or "").strip(),
        "steps": steps,
        "notes": str(data.get("notes") or "").strip(),
    }
    if entry_type == "recipe":
        result.update({
            "prep_time": (str(data["prep_time"]).strip() if data.get("prep_time") else None),
            "cook_time": (str(data["cook_time"]).strip() if data.get("cook_time") else None),
            "servings": (str(data["servings"]).strip() if data.get("servings") else None),
            "ingredients": [str(i).strip() for i in (data.get("ingredients") or []) if str(i).strip()],
        })
    elif entry_type in {"ritual", "festival"}:
        result.update({
            "occasion": (str(data["occasion"]).strip() if data.get("occasion") else None),
            "items_needed": [str(i).strip() for i in (data.get("items_needed") or []) if str(i).strip()],
            "participants": (str(data["participants"]).strip() if data.get("participants") else None),
            "significance": (str(data["significance"]).strip() if data.get("significance") else None),
            "time_of_year": (str(data["time_of_year"]).strip() if data.get("time_of_year") else None),
        })
    elif entry_type == "song":
        result.update({
            "occasion": (str(data["occasion"]).strip() if data.get("occasion") else None),
            "language": (str(data["language"]).strip() if data.get("language") else None),
            "lyrics_original": (str(data["lyrics_original"]).strip() if data.get("lyrics_original") else None),
            "lyrics_english": (str(data["lyrics_english"]).strip() if data.get("lyrics_english") else None),
            "when_sung": (str(data["when_sung"]).strip() if data.get("when_sung") else None),
        })
    return result


def _system_prompt_for_entry_type(entry_type: str):
    """Return (system_message, schema_hint, fallback_extra_fields) for the given entry type."""
    if entry_type == "ritual":
        sys_msg = (
            "You are a thoughtful family historian. You're transcribing an elder describing a family ritual or "
            "ceremony (housewarming pooja, baby naming, prayer, etc.). Produce a structured English entry that "
            "captures the ritual faithfully — what it is, what's needed, who participates, the steps, and the "
            "significance — without inventing details the speaker didn't share.\n\n"
            "RULES:\n"
            "- Title: a clean, evocative English name (keep the user-provided one if it fits).\n"
            "- Description: 2–3 sentences capturing the spirit of the ritual.\n"
            "- occasion: the event/festival it's tied to (e.g., 'Griha Pravesh', 'Aksharabhyasam', 'Diwali Lakshmi Pooja'). Null if not stated.\n"
            "- items_needed: list each item/material the speaker mentions (e.g., 'mango leaves', 'turmeric', 'coconut'). "
            "Keep cultural names with English equivalents in parentheses on first mention.\n"
            "- participants: who performs it (e.g., 'the eldest woman of the house', 'the bride and groom'). Null if not said.\n"
            "- steps: numbered, action-first instructions in cookbook-style English. Each step is one technique.\n"
            "- significance: 1–2 sentences on why this is done (cultural meaning). Null if not said.\n"
            "- time_of_year: when it's performed (e.g., 'on Pongal day', 'before sunrise'). Null if not said.\n"
            "- notes: any extra family wisdom or memory the speaker shared. Empty string if none.\n"
            "- Each step must include `from_indices`: list of segment numbers it derives from (e.g. [3,4]).\n"
            "- Never invent. If a field isn't in the audio, return null.\n"
            "Return STRICT JSON. No markdown, no commentary, no code fences."
        )
        schema_hint = (
            '{\n  "title": "string",\n  "description": "string",\n  "occasion": "string or null",\n'
            '  "items_needed": ["string", ...],\n  "participants": "string or null",\n'
            '  "significance": "string or null",\n  "time_of_year": "string or null",\n'
            '  "steps": [{"text": "instruction", "from_indices": [int, ...]}],\n  "notes": "string"\n}'
        )
        return sys_msg, schema_hint, {"occasion": None, "items_needed": [], "participants": None, "significance": None, "time_of_year": None}
    if entry_type == "festival":
        sys_msg = (
            "You are a thoughtful family historian. You're transcribing someone describing a festival as their "
            "family celebrates it (Diwali, Pongal, Christmas, Eid, etc.). Capture the family's specific way of "
            "doing it — what's done, when, what foods, what people, what stories — without inventing details.\n\n"
            "RULES:\n"
            "- Title: the festival name (e.g., 'Pongal in our home').\n"
            "- Description: 2–3 sentences capturing the festival's role in the family.\n"
            "- occasion: the festival name itself (cleanly capitalized).\n"
            "- time_of_year: when it falls (e.g., 'mid-January, on the first day of the Tamil month Thai').\n"
            "- items_needed: things the family prepares (e.g., 'kolam rice flour', 'sugarcane', 'new pots').\n"
            "- participants: who's involved.\n"
            "- significance: cultural/religious meaning of the festival.\n"
            "- steps: how the family observes it, in order. Each step is one tradition/activity.\n"
            "- notes: stories, memories, or family-specific touches.\n"
            "- Each step must include `from_indices`.\n"
            "- Never invent. Null if not said.\n"
            "Return STRICT JSON. No markdown."
        )
        schema_hint = (
            '{\n  "title": "string",\n  "description": "string",\n  "occasion": "string",\n'
            '  "time_of_year": "string or null",\n  "items_needed": ["string", ...],\n'
            '  "participants": "string or null",\n  "significance": "string or null",\n'
            '  "steps": [{"text": "tradition/activity", "from_indices": [int, ...]}],\n  "notes": "string"\n}'
        )
        return sys_msg, schema_hint, {"occasion": None, "items_needed": [], "participants": None, "significance": None, "time_of_year": None}
    if entry_type == "song":
        sys_msg = (
            "You are a thoughtful family historian. You're transcribing someone singing or reciting a song, "
            "blessing, lullaby, or chant. Preserve the original language faithfully AND provide a clear English "
            "translation. Capture when it's traditionally sung and what it means.\n\n"
            "RULES:\n"
            "- Title: a short, evocative name (keep user-provided if it fits).\n"
            "- Description: 2–3 sentences on what this song/blessing is.\n"
            "- language: the language (e.g., 'Tamil', 'Sanskrit', 'Hindi').\n"
            "- lyrics_original: the lyrics in the ORIGINAL language/script as best you can transcribe.\n"
            "- lyrics_english: a meaningful English translation that preserves meaning, not literal word-for-word.\n"
            "- occasion: when/why it's sung (e.g., 'lullaby', 'before meals', 'naming ceremony').\n"
            "- when_sung: more specific timing if the speaker says (e.g., 'sung on the bride's wedding morning').\n"
            "- steps: optional — usually empty for songs, but if there's a recitation procedure include it. "
            "Each step still needs `from_indices`.\n"
            "- notes: family memories, who used to sing it, etc.\n"
            "Return STRICT JSON. No markdown."
        )
        schema_hint = (
            '{\n  "title": "string",\n  "description": "string",\n  "language": "string or null",\n'
            '  "lyrics_original": "multi-line string or null",\n  "lyrics_english": "multi-line string or null",\n'
            '  "occasion": "string or null",\n  "when_sung": "string or null",\n'
            '  "steps": [{"text": "string", "from_indices": [int, ...]}] or [],\n  "notes": "string"\n}'
        )
        return sys_msg, schema_hint, {"occasion": None, "language": None, "lyrics_original": None, "lyrics_english": None, "when_sung": None}
    # Default: recipe (the original prompt)
    sys_msg = (
        "You are a meticulous cookbook editor. You receive a recipe described in English, broken into "
        "numbered transcript segments (each one a moment in the speaker's narration). Produce a polished, "
        "fully-detailed recipe card in the style of a professional cookbook.\n\n"
        "ABSOLUTE FIDELITY RULE — read this twice:\n"
        "  You are NOT allowed to add ingredients, quantities, techniques, garnishes, tempering items, "
        "  spices, or steps that the speaker did not literally mention. Even if the dish 'typically' "
        "  contains those things — even if leaving them out makes the recipe seem incomplete — DO NOT ADD "
        "  THEM. The speaker's grandmother's version is the ONLY authority. Your job is to TRANSCRIBE A "
        "  TRADITION, not to publish your own recipe. If something is unclear (e.g. the word 'thaan' or "
        "  'dhal'), keep the speaker's word as-is — never substitute a 'better' ingredient.\n\n"
        "STRUCTURE RULES:\n"
        "- Title: a clean, evocative English name (keep the user-provided one if it fits).\n"
        "- Description: 2–3 sentences capturing the dish — what it is, where it comes from, why someone would cook it. "
        "Describe ONLY the dish as the speaker made it; do not embellish with ingredients or techniques they didn't mention.\n"
        "- Servings, Prep time, Cook time — three-tier rule. Be honest; do not fabricate.\n"
        "    1. EXPLICIT — speaker stated it → use that value verbatim (e.g. 'Serves 4', '40 minutes').\n"
        "    2. ESTIMATED — if not stated but reliably computable from the recipe itself, prefix with '~':\n"
        "         • Cook time = SUM of every cooking duration in the steps "
        "           (sauté 5 min + simmer 30 min + bake 20 min ⇒ '~55 minutes'). Skip passive resting unless said.\n"
        "         • Prep time = estimate only if prep work is substantial and obvious (lots of chopping/kneading).\n"
        "         • Servings — derive only from anchor quantities, cookbook standards:\n"
        "             - Pasta ~100 g/person; Rice (uncooked) ~75 g/person; Boneless meat ~150–200 g/person; "
        "Whole chicken ~1.5 kg ⇒ Serves 4; 8–9 inch cake ⇒ Serves 8; Cookies/muffins yield is the count.\n"
        "         Format estimates as 'Serves ~4' or 'Makes ~12'. If no anchor → null.\n"
        "    3. NULL — neither stated nor reliably estimable → null. Don't guess.\n"
        "- Ingredients: list ONLY ingredients the speaker mentioned. One per line, with QUANTITY + UNIT + ingredient "
        "  exactly as the speaker said. If they said 'a little salt', write 'salt, to taste'. If they said "
        "  '2 spoons of coconut', write '2 tablespoons coconut' — DO NOT downgrade to 'coconut, as needed'. "
        "  Preserve every quantity. NEVER add an ingredient that isn't in the transcript, no matter how typical it is.\n"
        "- Steps: clear, numbered, action-first instructions. Each step:\n"
        "    * begins with an imperative verb (Heat, Stir, Add, Roast…),\n"
        "    * includes temperatures, times and visual cues the speaker actually said,\n"
        "    * is a single technique — split long descriptions into multiple steps,\n"
        "    * reads like a real cookbook, not a transcript dump,\n"
        "    * stays faithful — don't add steps the speaker didn't describe.\n"
        "- For each step, return `from_indices`: a list of segment numbers that the step is derived from "
        "(e.g. [3, 4, 5]). This tells the system which audio range to play for that step. Be precise; only include "
        "segments that genuinely describe that step.\n"
        "- Notes: extra family wisdom, substitutions, or memories the speaker actually mentioned. Empty string if none.\n\n"
        "Self-check before returning: count the ingredients the speaker named. Your output ingredient list "
        "MUST contain the same count of distinct items — no extras. If a partial phrase was cut off across "
        "segments, prefer listing fewer items over inventing one.\n\n"
        "Always return STRICT JSON. No markdown, no commentary, no code fences."
    )
    schema_hint = (
        '{\n'
        '  "title": "string",\n'
        '  "description": "string (2-3 sentence English summary)",\n'
        '  "prep_time": "string e.g. \\"20 minutes\\" or null",\n'
        '  "cook_time": "string e.g. \\"45 minutes\\" or null",\n'
        '  "servings": "string e.g. \\"Serves 4\\" or null",\n'
        '  "ingredients": ["quantity + unit + ingredient (English)", ...],\n'
        '  "steps": [{"text": "imperative cookbook-style instruction", "from_indices": [int, ...]}],\n'
        '  "notes": "string (family tips, substitutions, memories) or empty string"\n'
        '}'
    )
    return sys_msg, schema_hint, {"ingredients": [], "prep_time": None, "cook_time": None, "servings": None}


# ===================== Recipe image generation =====================
async def _generate_recipe_image(
    *, title: str, description: str, ingredients: List[str], entry_id: Optional[str] = None,
) -> Optional[str]:
    """Generate a photorealistic dish photo using Gemini. Stores in Supabase Storage when entry_id is set."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        logger.warning(f"emergentintegrations import failed for image gen: {e}")
        return None

    # Build a vivid food-photography prompt — the dish name does most of the work
    ing_hint = ", ".join(ingredients[:8]) if ingredients else ""
    desc_hint = (description or "").strip()
    prompt = (
        f"Photorealistic overhead food photography of {title}. "
        + (f"Dish description: {desc_hint}. " if desc_hint else "")
        + (f"Key ingredients visible: {ing_hint}. " if ing_hint else "")
        + "Plated beautifully on rustic ceramic ware on a warm wooden table. "
        + "Soft natural window light, golden tones, shallow depth of field, "
        + "garnished naturally, steam if hot. Editorial cookbook aesthetic. "
        + "No text, no watermark, no cutlery labels."
    )

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"img-{uuid.uuid4().hex[:8]}",
            system_message="You are a professional food photographer.",
        ).with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    except Exception as e:
        logger.warning(f"Image generation failed: {e}")
        return None

    if not images:
        return None

    img = images[0]
    mime = img.get("mime_type") or "image/png"
    raw = base64.b64decode(img["data"]) if isinstance(img.get("data"), str) else bytes(img.get("data") or b"")

    from supabase_store import store_entry_image
    if entry_id:
        return store_entry_image(entry_id, raw, mime, "main.png")
    return None


@api_router.get("/")
async def root():
    return {"message": "Mamascript API"}


app.include_router(api_router)

cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins or ["*"],
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    if not is_supabase_configured():
        logger.warning("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — media routes need Supabase")
    else:
        logger.info("Mamascript API ready (Supabase data + storage)")
