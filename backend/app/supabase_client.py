"""Shared server-only Supabase client for service-role operations."""

from __future__ import annotations

import os
from functools import lru_cache

from app.settings import load_backend_environment

load_backend_environment()


def supabase_url() -> str:
    return (os.getenv("SUPABASE_URL") or "").strip().rstrip("/")


def supabase_service_role_key() -> str:
    return (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SERVICE_KEY")
        or ""
    ).strip()


@lru_cache(maxsize=1)
def get_supabase_client():
    url = supabase_url()
    service_role_key = supabase_service_role_key()
    if not url or not service_role_key:
        raise RuntimeError("Supabase service configuration is missing.")

    from supabase import create_client

    return create_client(url, service_role_key)
