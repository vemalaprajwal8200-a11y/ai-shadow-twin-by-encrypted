"""Authentication and Role-Based Access Control (RBAC) for FastAPI backend.

Verifies Supabase JWT access tokens against Supabase Auth, retrieves the verified
role from the 'profiles' database table, and enforces faculty-only endpoint access.
Also provides server-side faculty invite code validation (controlled by FACULTY_INVITE_CODE).
"""

import os
from typing import Any
import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Security scheme for Swagger UI & header extraction
security = HTTPBearer(auto_error=False)


def get_supabase_config() -> tuple[str, str]:
    """Retrieve Supabase URL and Service Key from environment without logging secrets."""
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
    return url, service_key


def get_faculty_invite_code() -> str:
    """Return configured FACULTY_INVITE_CODE or empty string if not configured."""
    return os.getenv("FACULTY_INVITE_CODE", "").strip()


def is_faculty_code_valid(submitted_code: str | None) -> bool:
    """Check if submitted code matches FACULTY_INVITE_CODE when required.

    If FACULTY_INVITE_CODE is not set, faculty registration is open (returns True).
    If FACULTY_INVITE_CODE is set, submitted_code must strictly match.
    """
    configured_code = get_faculty_invite_code()
    if not configured_code:
        # No invite code required by institution; open faculty sign-up
        return True
    if not submitted_code:
        return False
    return submitted_code.strip() == configured_code


async def fetch_user_from_supabase_token(token: str) -> dict[str, Any]:
    """Verify Supabase JWT token with Supabase Auth endpoint."""
    url, service_key = get_supabase_config()
    if not url or not service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured on the backend.",
        )

    # Call Supabase /auth/v1/user to verify the token signature and expiration
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{url}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": service_key,
                },
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Could not reach authentication service.",
            ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return response.json()


async def fetch_role_from_profiles(user_id: str) -> str:
    """Fetch user's single-source-of-truth role from public.profiles table using service key."""
    url, service_key = get_supabase_config()
    if not url or not service_key:
        return "student"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # Query profiles table matching user_id or id column
            response = await client.get(
                f"{url}/rest/v1/profiles",
                params={
                    "or": f"(user_id.eq.{user_id},id.eq.{user_id})",
                    "select": "role",
                },
                headers={
                    "apikey": service_key,
                    "Authorization": f"Bearer {service_key}",
                },
            )
            if response.status_code == 200:
                rows = response.json()
                if rows and isinstance(rows, list) and len(rows) > 0:
                    role_val = rows[0].get("role")
                    if role_val in ("faculty", "student"):
                        return role_val
        except Exception:
            # If database lookup fails, fall back to safe default 'student'
            pass

    return "student"


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    """Dependency that authenticates the caller and returns user dict with verified role."""
    # Test/Mock hook for unit tests without network secrets:
    test_role = request.headers.get("X-Test-Role")
    test_uid = request.headers.get("X-Test-User-Id", "test-user-id")
    if test_role and os.getenv("TESTING", "").lower() in ("1", "true", "yes"):
        valid_role = "faculty" if test_role == "faculty" else "student"
        return {"id": test_uid, "email": "test@example.com", "role": valid_role}

    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please include a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    user_info = await fetch_user_from_supabase_token(token)
    user_id = user_info.get("id")
    email = user_info.get("email", "")

    # Always verify role from database profiles table (single source of truth)
    role = await fetch_role_from_profiles(user_id)

    return {
        "id": user_id,
        "email": email,
        "role": role,
        "user_metadata": user_info.get("user_metadata", {}),
    }


def require_faculty(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Dependency enforcing faculty-only role. Returns 403 JSON for student users."""
    if current_user.get("role") != "faculty":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Faculty access required.",
        )
    return current_user
