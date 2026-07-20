"""Supabase Postgres + Storage access for FastAPI media/AI routes."""
import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger(__name__)

IMAGE_BUCKET = "entry-images"
AUDIO_BUCKET = "entry-audio"


def _sb():
    client = get_supabase()
    if not client:
        raise RuntimeError("Supabase is not configured")
    return client


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_membership(vault_id: str, user_id: str) -> Optional[dict]:
    res = (
        _sb()
        .table("vault_members")
        .select("role")
        .eq("vault_id", vault_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return res.data


def get_entry(entry_id: str) -> Optional[dict]:
    res = _sb().table("entries").select("*").eq("id", entry_id).maybe_single().execute()
    if not res.data:
        return None
    return _map_entry(res.data)


def _map_entry(row: dict) -> dict:
    return {
        "entry_id": row["id"],
        "vault_id": row["vault_id"],
        "entry_type": row.get("entry_type", "recipe"),
        "title": row.get("title", ""),
        "description": row.get("description") or "",
        "ingredients": row.get("ingredients") or [],
        "steps": row.get("steps") or [],
        "prep_time": row.get("prep_time"),
        "cook_time": row.get("cook_time"),
        "servings": row.get("servings"),
        "notes": row.get("notes") or "",
        "occasion": row.get("occasion"),
        "items_needed": row.get("items_needed") or [],
        "participants": row.get("participants"),
        "significance": row.get("significance"),
        "time_of_year": row.get("time_of_year"),
        "language": row.get("language"),
        "lyrics_original": row.get("lyrics_original"),
        "lyrics_english": row.get("lyrics_english"),
        "when_sung": row.get("when_sung"),
        "image_url": row.get("image_url"),
        "audio_path": row.get("audio_path"),
        "has_audio": row.get("has_audio", False),
        "audio_duration": row.get("audio_duration"),
        "original_language": row.get("original_language"),
        "created_by_user_id": row["created_by_user_id"],
        "created_by_name": row.get("created_by_name", "User"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def get_vault(vault_id: str) -> Optional[dict]:
    res = _sb().table("vaults").select("*").eq("id", vault_id).maybe_single().execute()
    if not res.data:
        return None
    row = res.data
    return {
        "vault_id": row["id"],
        "name": row["name"],
        "created_by_user_id": row["created_by_user_id"],
        "created_at": row.get("created_at"),
    }


def list_vault_entries(vault_id: str, limit: int = 100) -> List[dict]:
    res = (
        _sb()
        .table("entries")
        .select("*")
        .eq("vault_id", vault_id)
        .order("created_at")
        .limit(limit)
        .execute()
    )
    return [_map_entry(r) for r in (res.data or [])]


def count_vault_entries(vault_id: str) -> int:
    res = (
        _sb()
        .table("entries")
        .select("id", count="exact")
        .eq("vault_id", vault_id)
        .execute()
    )
    return res.count or 0


def insert_entry(entry: dict) -> dict:
    row = {
        "id": entry.get("entry_id") or str(uuid.uuid4()),
        "vault_id": entry["vault_id"],
        "entry_type": entry.get("entry_type", "recipe"),
        "title": entry.get("title", "Untitled"),
        "description": entry.get("description") or "",
        "ingredients": entry.get("ingredients") or [],
        "steps": entry.get("steps") or [],
        "prep_time": entry.get("prep_time"),
        "cook_time": entry.get("cook_time"),
        "servings": entry.get("servings"),
        "notes": entry.get("notes") or "",
        "occasion": entry.get("occasion"),
        "items_needed": entry.get("items_needed") or [],
        "participants": entry.get("participants"),
        "significance": entry.get("significance"),
        "time_of_year": entry.get("time_of_year"),
        "language": entry.get("language"),
        "lyrics_original": entry.get("lyrics_original"),
        "lyrics_english": entry.get("lyrics_english"),
        "when_sung": entry.get("when_sung"),
        "image_url": entry.get("image_url"),
        "audio_path": entry.get("audio_path"),
        "has_audio": entry.get("has_audio", False),
        "audio_duration": entry.get("audio_duration"),
        "original_language": entry.get("original_language"),
        "created_by_user_id": entry["created_by_user_id"],
        "created_by_name": entry.get("created_by_name", "User"),
        "created_at": entry.get("created_at", _now()),
        "updated_at": entry.get("updated_at", _now()),
    }
    res = _sb().table("entries").insert(row).execute()
    return _map_entry(res.data[0])


def update_entry(entry_id: str, updates: dict) -> Optional[dict]:
    updates = {k: v for k, v in updates.items() if v is not None}
    updates["updated_at"] = _now()
    res = _sb().table("entries").update(updates).eq("id", entry_id).execute()
    if not res.data:
        return get_entry(entry_id)
    return _map_entry(res.data[0])


def list_vault_member_ids(vault_id: str) -> List[str]:
    res = _sb().table("vault_members").select("user_id").eq("vault_id", vault_id).execute()
    return [r["user_id"] for r in (res.data or [])]


def create_notification(
    *, user_id: str, title: str, body: str,
    link: Optional[str] = None, entry_id: Optional[str] = None, vault_id: Optional[str] = None,
):
    _sb().table("notifications").insert({
        "user_id": user_id,
        "title": title,
        "body": body,
        "link": link,
        "entry_id": entry_id,
        "vault_id": vault_id,
    }).execute()


def upload_bytes(bucket: str, path: str, data: bytes, content_type: str):
    _sb().storage.from_(bucket).upload(
        path, data, file_options={"content-type": content_type, "upsert": "true"},
    )


def download_bytes(bucket: str, path: str) -> Optional[bytes]:
    try:
        res = _sb().storage.from_(bucket).download(path)
        return res
    except Exception as exc:
        logger.warning("Storage download failed %s/%s: %s", bucket, path, exc)
        return None


def storage_image_path(entry_id: str, suffix: str = "main.png") -> str:
    return f"{entry_id}/{suffix}"


def sb_image_url(entry_id: str, filename: str) -> str:
    return f"sb://{IMAGE_BUCKET}/{entry_id}/{filename}"


def sb_audio_url(entry_id: str, filename: str) -> str:
    return f"sb://{AUDIO_BUCKET}/{entry_id}/{filename}"


def parse_sb_url(url: str) -> tuple:
    """Return (bucket, path) from sb://bucket/path."""
    if not url or not url.startswith("sb://"):
        return None, None
    rest = url[5:]
    slash = rest.find("/")
    if slash < 0:
        return rest, ""
    return rest[:slash], rest[slash + 1 :]


def store_entry_audio(entry_id: str, audio_bytes: bytes, mime_type: str) -> str:
    ext_map = {
        "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3",
        "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/wav": "wav",
    }
    ext = ext_map.get((mime_type or "").split(";")[0].strip(), "webm")
    path = storage_image_path(entry_id, f"recording.{ext}").replace("main.png", f"recording.{ext}")
    path = f"{entry_id}/recording.{ext}"
    upload_bytes(AUDIO_BUCKET, path, audio_bytes, mime_type or "audio/webm")
    return sb_audio_url(entry_id, f"recording.{ext}")


def store_entry_image(entry_id: str, image_bytes: bytes, mime_type: str, filename: str = "main.png") -> str:
    path = f"{entry_id}/{filename}"
    upload_bytes(IMAGE_BUCKET, path, image_bytes, mime_type or "image/png")
    return sb_image_url(entry_id, filename)
