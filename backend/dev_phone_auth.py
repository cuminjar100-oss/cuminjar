"""Console dev auth — OTP / recovery links in logs until SMS & email providers are configured."""
import logging
import os
import re
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger(__name__)

router = APIRouter()

OTP_TTL = timedelta(minutes=10)
# phone (E.164) -> {otp, expires_at}
_pending_otps: dict[str, dict] = {}


def console_otp_enabled() -> bool:
    return os.environ.get("CONSOLE_OTP", "").strip().lower() in ("1", "true", "yes")


def normalize_mobile(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return None


def _generate_otp() -> str:
    return f"{secrets.randbelow(900_000) + 100_000:06d}"


def _purge_expired() -> None:
    now = datetime.now(timezone.utc)
    expired = [phone for phone, row in _pending_otps.items() if row["expires_at"] <= now]
    for phone in expired:
        _pending_otps.pop(phone, None)


def _store_otp(phone: str) -> str:
    _purge_expired()
    otp = _generate_otp()
    _pending_otps[phone] = {
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + OTP_TTL,
    }
    return otp


def _consume_otp(phone: str, otp: str) -> bool:
    _purge_expired()
    row = _pending_otps.get(phone)
    if not row or row["otp"] != otp.strip():
        return False
    if row["expires_at"] <= datetime.now(timezone.utc):
        _pending_otps.pop(phone, None)
        return False
    _pending_otps.pop(phone, None)
    return True


def _lookup_profile_by_phone(phone: str):
    sb = get_supabase()
    if not sb or not is_supabase_configured():
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    try:
        res = sb.table("profiles").select("id, email").eq("mobile", phone).maybe_single().execute()
        return res.data
    except Exception as exc:
        logger.warning("profile lookup failed for %s: %s", phone, exc)
        return None


def _session_token_hash_for_email(email: str) -> dict:
    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    try:
        link_res = sb.auth.admin.generate_link({"type": "magiclink", "email": email})
    except Exception as exc:
        logger.exception("generate_link failed for console phone login")
        raise HTTPException(status_code=502, detail="Could not create session.") from exc

    props = getattr(link_res, "properties", None)
    if props is None and isinstance(link_res, dict):
        props = link_res.get("properties")

    token_hash = None
    if props is not None:
        token_hash = getattr(props, "hashed_token", None)
        if token_hash is None and isinstance(props, dict):
            token_hash = props.get("hashed_token")

    if not token_hash:
        raise HTTPException(status_code=502, detail="Could not create session.")

    return {"token_hash": token_hash, "type": "email"}


def _link_properties(link_res) -> dict:
    props = getattr(link_res, "properties", None)
    if props is None and isinstance(link_res, dict):
        props = link_res.get("properties")
    if props is None:
        return {}
    if isinstance(props, dict):
        return props
    return {
        "action_link": getattr(props, "action_link", None),
        "hashed_token": getattr(props, "hashed_token", None),
    }


def _lookup_profile_by_email(email: str):
    sb = get_supabase()
    if not sb or not is_supabase_configured():
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    try:
        res = sb.table("profiles").select("id, email").eq("email", email.lower()).maybe_single().execute()
        return res.data
    except Exception as exc:
        logger.warning("profile lookup failed for %s: %s", email, exc)
        return None


class DevEmailResetIn(BaseModel):
    email: str
    redirect_to: str | None = None


class DevPhoneSendIn(BaseModel):
    phone: str


class DevPhoneVerifyIn(BaseModel):
    phone: str
    otp: str


@router.post("/auth/dev/password-reset/send")
def dev_password_reset_send(payload: DevEmailResetIn):
    """Generate a password-reset link (shown in UI / console instead of email)."""
    if not console_otp_enabled():
        raise HTTPException(
            status_code=503,
            detail="Console dev mode is off. Set CONSOLE_OTP=true in backend/.env and restart the server.",
        )

    email = (payload.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    sb = get_supabase()
    if not sb:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")

    redirect_to = (payload.redirect_to or "http://localhost:3000/login").strip()
    try:
        link_res = sb.auth.admin.generate_link({
            "type": "recovery",
            "email": email,
            "options": {"redirect_to": redirect_to},
        })
    except Exception as exc:
        logger.exception("generate_link recovery failed for %s", email)
        msg = str(exc).lower()
        if "user" in msg and ("not found" in msg or "does not exist" in msg):
            raise HTTPException(
                status_code=404,
                detail="No account found for this email. Create an account first.",
            ) from exc
        raise HTTPException(status_code=502, detail="Could not create reset link.") from exc

    props = _link_properties(link_res)
    action_link = props.get("action_link")
    if not action_link:
        raise HTTPException(status_code=502, detail="Could not create reset link.")

    logger.info("[CONSOLE_OTP] Password reset link for %s", email)
    return {
        "email": email,
        "action_link": action_link,
        "expires_in": int(OTP_TTL.total_seconds()),
    }


@router.post("/auth/dev/phone-otp/send")
def dev_phone_otp_send(payload: DevPhoneSendIn):
    """Generate a one-time 6-digit OTP (shown in browser console instead of SMS)."""
    if not console_otp_enabled():
        raise HTTPException(status_code=404, detail="Not found")

    phone = normalize_mobile(payload.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number.")

    profile = _lookup_profile_by_phone(phone)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No account found for this number. Create an account first.",
        )

    otp = _store_otp(phone)
    logger.info("[CONSOLE_OTP] Generated OTP for %s (expires in %s min)", phone, int(OTP_TTL.total_seconds() // 60))

    return {
        "phone": phone,
        "otp": otp,
        "expires_in": int(OTP_TTL.total_seconds()),
    }


@router.post("/auth/dev/phone-verify")
def dev_phone_verify(payload: DevPhoneVerifyIn):
    """Verify console OTP and return a token_hash for Supabase session exchange."""
    if not console_otp_enabled():
        raise HTTPException(status_code=404, detail="Not found")

    phone = normalize_mobile(payload.phone)
    if not phone:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number.")

    if not _consume_otp(phone, payload.otp):
        raise HTTPException(status_code=401, detail="Incorrect or expired verification code.")

    profile = _lookup_profile_by_phone(phone)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No account found for this number. Create an account first.",
        )

    email = (profile.get("email") or "").strip()
    if not email:
        raise HTTPException(
            status_code=400,
            detail="This account has no email on file. Sign in with email and password for now.",
        )

    logger.info("[CONSOLE_OTP] OTP verified for %s — issuing session", phone)
    return _session_token_hash_for_email(email)
