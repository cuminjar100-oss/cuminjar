"""Verify Supabase access tokens and map to the FastAPI User model."""
import logging
from typing import Optional

from supabase_client import get_supabase, is_supabase_configured

logger = logging.getLogger(__name__)


def _looks_like_jwt(token: str) -> bool:
    return token.count(".") == 2 and token.startswith("eyJ")


def user_from_supabase_token(token: str):
    """Return a User instance if token is a valid Supabase JWT, else None."""
    if not is_supabase_configured() or not _looks_like_jwt(token):
        return None

    sb = get_supabase()
    if not sb:
        return None

    try:
        auth_res = sb.auth.get_user(token)
        auth_user = auth_res.user if auth_res else None
        if not auth_user:
            return None

        profile = None
        try:
            res = (
                sb.table("profiles")
                .select("id, name, email, mobile, created_at")
                .eq("id", auth_user.id)
                .maybe_single()
                .execute()
            )
            profile = res.data
        except Exception as exc:
            logger.warning("profiles lookup failed for %s: %s", auth_user.id, exc)

        meta = auth_user.user_metadata or {}
        name = (profile or {}).get("name") or meta.get("name") or "User"
        email = (profile or {}).get("email") or auth_user.email or ""
        mobile = (profile or {}).get("mobile") or auth_user.phone or meta.get("mobile")
        created_at = (profile or {}).get("created_at")
        if created_at is not None and hasattr(created_at, "isoformat"):
            created_at = created_at.isoformat()

        return {
            "user_id": str(auth_user.id),
            "email": email or "",
            "name": name,
            "mobile": mobile,
            "created_at": created_at,
        }
    except Exception as exc:
        logger.debug("Supabase JWT verification failed: %s", exc)
        return None
