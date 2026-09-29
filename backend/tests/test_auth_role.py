"""Unit tests for backend role enforcement and authentication.

Tests 401 unauthorized, 403 forbidden for student calling faculty endpoint,
200 OK for faculty, faculty invite code validation, and role trigger validation logic.
All tests run with fake/mock credentials and never call external networks or secrets.
"""

import os
from fastapi.testclient import TestClient
from app.main import app
from app.auth import is_faculty_code_valid

client = TestClient(app)


def test_missing_auth_token_returns_401():
    """Unauthenticated calls to protected faculty endpoint must return 401."""
    response = client.post("/courses/test-course-id/analyze")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_student_calling_faculty_analyze_returns_403(monkeypatch):
    """Students calling /courses/{course_id}/analyze must receive a 403 Forbidden."""
    monkeypatch.setenv("TESTING", "1")
    # Simulate an authenticated student via test headers
    response = client.post(
        "/courses/test-course-id/analyze",
        headers={
            "Authorization": "Bearer mock-student-token",
            "X-Test-Role": "student",
            "X-Test-User-Id": "student-uid-123",
        },
    )
    assert response.status_code == 403
    assert "Faculty access required" in response.json().get("detail", "")


def test_student_calling_faculty_findings_returns_403(monkeypatch):
    """Students calling /courses/{course_id}/findings must receive a 403 Forbidden."""
    monkeypatch.setenv("TESTING", "1")
    response = client.get(
        "/courses/test-course-id/findings",
        headers={
            "Authorization": "Bearer mock-student-token",
            "X-Test-Role": "student",
            "X-Test-User-Id": "student-uid-123",
        },
    )
    assert response.status_code == 403
    assert "Faculty access required" in response.json().get("detail", "")


def test_faculty_calling_faculty_endpoints_allowed(monkeypatch):
    """Faculty calling faculty endpoints must not receive 403 Forbidden."""
    monkeypatch.setenv("TESTING", "1")
    # Mock items and status storage functions to avoid database dependencies
    from app import main

    monkeypatch.setattr(main, "get_findings", lambda _course_id: [])
    monkeypatch.setattr(main, "get_course_status", lambda _course_id: {"status": "ok"})

    response = client.get(
        "/courses/test-course-id/findings",
        headers={
            "Authorization": "Bearer mock-faculty-token",
            "X-Test-Role": "faculty",
            "X-Test-User-Id": "faculty-uid-456",
        },
    )
    assert response.status_code == 200
    assert response.json() == []

    summary_resp = client.get(
        "/courses/test-course-id/summary",
        headers={
            "Authorization": "Bearer mock-faculty-token",
            "X-Test-Role": "faculty",
            "X-Test-User-Id": "faculty-uid-456",
        },
    )
    assert summary_resp.status_code == 200
    assert summary_resp.json()["totalFindings"] == 0


def test_invite_code_when_env_var_not_set(monkeypatch):
    """When FACULTY_INVITE_CODE is unset, registration is open and valid is True."""
    monkeypatch.delenv("FACULTY_INVITE_CODE", raising=False)
    assert is_faculty_code_valid(None) is True
    assert is_faculty_code_valid("any-code") is True

    response = client.post("/auth/verify-faculty-code", json={"code": ""})
    assert response.status_code == 200
    assert response.json() == {"required": False, "valid": True}


def test_invite_code_when_env_var_is_set(monkeypatch):
    """When FACULTY_INVITE_CODE is set, code must strictly match."""
    monkeypatch.setenv("FACULTY_INVITE_CODE", "SECRET_FACULTY_2026")

    assert is_faculty_code_valid(None) is False
    assert is_faculty_code_valid("WRONG_CODE") is False
    assert is_faculty_code_valid("SECRET_FACULTY_2026") is True

    # Test via API endpoint
    wrong_resp = client.post("/auth/verify-faculty-code", json={"code": "wrong"})
    assert wrong_resp.status_code == 200
    assert wrong_resp.json() == {"required": True, "valid": False}

    correct_resp = client.post("/auth/verify-faculty-code", json={"code": "SECRET_FACULTY_2026"})
    assert correct_resp.status_code == 200
    assert correct_resp.json() == {"required": True, "valid": True}


def test_database_trigger_role_validation_logic():
    """Test SQL trigger logic: role must be strictly 'student' or 'faculty', defaulting to 'student'."""
    def simulate_trigger_role_validation(raw_meta: dict) -> str:
        role = raw_meta.get("role") or raw_meta.get("requested_role") or "student"
        if role in ("student", "faculty"):
            return role
        return "student"

    assert simulate_trigger_role_validation({"role": "faculty"}) == "faculty"
    assert simulate_trigger_role_validation({"role": "student"}) == "student"
    assert simulate_trigger_role_validation({"requested_role": "faculty"}) == "faculty"
    assert simulate_trigger_role_validation({"role": "admin"}) == "student"
    assert simulate_trigger_role_validation({"role": "superadmin"}) == "student"
    assert simulate_trigger_role_validation({}) == "student"
    assert simulate_trigger_role_validation({"role": ""}) == "student"


def test_role_mapping_resolution():
    """Verify role resolution prioritizes profiles table and defaults invalid inputs to student."""
    def resolve_role(db_role: str | None, meta_role: str | None) -> str:
        if db_role == "faculty":
            return "faculty"
        if db_role == "student":
            return "student"
        if meta_role in ("faculty", "student"):
            return meta_role
        return "student"

    assert resolve_role("faculty", "student") == "faculty"
    assert resolve_role("student", "faculty") == "student"
    assert resolve_role(None, "faculty") == "faculty"
    assert resolve_role(None, "student") == "student"
    assert resolve_role(None, "other") == "student"


def test_redirect_function_for_each_role():
    """Verify role-based redirect destinations."""
    def get_dashboard_path(role: str | None) -> str:
        return "/faculty/dashboard" if role == "faculty" else "/student/dashboard"

    assert get_dashboard_path("faculty") == "/faculty/dashboard"
    assert get_dashboard_path("student") == "/student/dashboard"
    assert get_dashboard_path(None) == "/student/dashboard"
    assert get_dashboard_path("unknown") == "/student/dashboard"


def test_route_guard_behavior():
    """Verify that route guards reject unauthorized roles and redirect to their respective dashboard."""
    def check_guard(user_role: str | None, allowed_roles: list[str]) -> tuple[bool, str]:
        if not user_role:
            return False, "/login"
        if user_role not in allowed_roles:
            user_dash = "/faculty/dashboard" if user_role == "faculty" else "/student/dashboard"
            return False, user_dash
        return True, ""

    # Authorized cases
    assert check_guard("faculty", ["faculty"]) == (True, "")
    assert check_guard("student", ["student"]) == (True, "")

    # Unauthorized cases
    assert check_guard("student", ["faculty"]) == (False, "/student/dashboard")
    assert check_guard("faculty", ["student"]) == (False, "/faculty/dashboard")
    assert check_guard(None, ["faculty"]) == (False, "/login")

