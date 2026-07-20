"""Supabase admin client (service role). Used to verify JWTs and query profiles."""
import os
from functools import lru_cache
from typing import Optional

from supabase import Client, create_client


def is_supabase_configured() -> bool:
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))


@lru_cache
def get_supabase() -> Optional[Client]:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)
