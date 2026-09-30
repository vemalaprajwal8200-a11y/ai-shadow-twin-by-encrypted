from pathlib import Path


SCHEMA_FILE = Path(__file__).resolve().parents[1] / "docs" / "shadow_twin_supabase_schema.sql"


def test_schema_defines_requested_tables_and_views():
    schema = SCHEMA_FILE.read_text(encoding="utf-8").lower()
    tables = (
        "profiles",
        "user_settings",
        "personas",
        "courses",
        "units",
        "uploads",
        "content_items",
        "analysis_runs",
        "item_results",
        "verdicts",
        "flags",
        "chat_sessions",
        "chat_messages",
        "report_exports",
    )
    views = (
        "v_twin_status",
        "v_course_overview",
        "v_flagged_per_unit",
        "v_verdict_split",
        "v_needs_attention",
        "v_persona_performance",
        "v_analysis_progress",
        "v_content_items",
        "v_accuracy_metrics",
        "v_defect_rate_per_unit",
        "v_flag_review",
    )
    for table in tables:
        assert f"create table if not exists public.{table}" in schema
    for view in views:
        assert f"create or replace view public.{view}" in schema
    assert "security_invoker = true" in schema
    assert "course-uploads" in schema
    assert "auth.uid()" in schema
