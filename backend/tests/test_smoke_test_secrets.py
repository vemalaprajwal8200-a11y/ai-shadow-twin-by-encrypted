"""Ensure smoke-test output never exposes API keys or URL credentials."""

from scripts.smoke_test import _redact_text, _redact_value, _safe_url


def test_safe_url_masks_user_info_and_sensitive_query_parameters():
    credential_url = (
        "https://" + "test-user" + ":" + "test-password"
        + "@example.test/api?token=fake-token&view=items"
    )
    safe_url = _safe_url(credential_url)

    assert "test-user" not in safe_url
    assert "test-password" not in safe_url
    assert "fake-token" not in safe_url
    assert "view=items" in safe_url


def test_redaction_masks_x_api_key_in_messages_and_payloads():
    fake_key = "not-a-real-key-value"
    safe_text = _redact_text(f"request x-api-key: {fake_key}", fake_key)
    safe_payload = _redact_value(
        {"x-api-key": fake_key, "message": f"echoed {fake_key}"}, fake_key
    )

    assert fake_key not in safe_text
    assert fake_key not in str(safe_payload)
