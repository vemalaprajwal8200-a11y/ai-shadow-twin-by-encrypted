"""Supabase row conversion and storage dispatch tests; no network calls are made."""

import os
import importlib
from unittest.mock import patch

import pytest

with patch.dict(os.environ, {"STORAGE_BACKEND": "local"}):
    from app import storage, storage_supabase

from app.models import Finding, Item, Run


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self.filters = {}

    def select(self, _columns):
        return self

    def eq(self, column, value):
        self.filters[column] = value
        return self

    def execute(self):
        rows = [
            row
            for row in self.rows
            if all(row.get(column) == value for column, value in self.filters.items())
        ]
        return FakeResponse(rows)


class FakeClient:
    def __init__(self, tables):
        self.tables = tables

    def table(self, name):
        return FakeQuery(self.tables[name])


def test_camel_case_rows_map_to_snake_case_and_back():
    item = Item(
        itemId="item-1",
        courseId="course-1",
        orderIndex=3,
        type="question",
        text="Question text",
        answerKey="42",
    )
    run = Run(
        runId="run-1",
        itemId="item-1",
        persona="student",
        answer="42",
        reasoning="Worked it out",
        confidence=0.9,
    )
    finding = Finding(
        itemId="item-1",
        label="content_defect",
        defectType="missing_prerequisite",
        severity="medium",
        evidence="Evidence",
        suggestedRewrite="Add a hint",
    )

    item_row = storage_supabase._item_to_row(item)
    run_row = storage_supabase._run_to_row(run)
    finding_row = storage_supabase._finding_to_row(finding, "course-1")

    assert item_row["item_id"] == item.itemId
    assert item_row["course_id"] == item.courseId
    assert item_row["order_index"] == item.orderIndex
    assert item_row["answer_key"] == item.answerKey
    assert storage_supabase._item_from_row(item_row) == item
    assert run_row["run_id"] == run.runId
    assert run_row["item_id"] == run.itemId
    assert storage_supabase._run_from_row(run_row) == run
    assert finding_row["defect_type"] == finding.defectType
    assert finding_row["suggested_rewrite"] == finding.suggestedRewrite
    assert storage_supabase._finding_from_row(finding_row) == finding


def test_storage_facade_selects_supabase_with_fake_client(monkeypatch):
    fake_client = FakeClient(
        {
            "runs": [
                {
                    "run_id": "run-1",
                    "item_id": "item-1",
                    "persona": "student",
                    "answer": "42",
                    "reasoning": "Worked it out",
                    "confidence": 0.9,
                    "context_mode": "taught_only",
                }
            ]
        }
    )
    monkeypatch.setattr(storage_supabase, "_client", fake_client)
    monkeypatch.setattr(storage_supabase, "initialize", lambda: None)

    try:
        with patch.dict(os.environ, {"STORAGE_BACKEND": "supabase"}):
            importlib.reload(storage)
        assert storage._backend is storage_supabase
        runs = storage.get_runs("item-1")
    finally:
        with patch.dict(os.environ, {"STORAGE_BACKEND": "local"}):
            importlib.reload(storage)

    assert runs == [
        Run(
            runId="run-1",
            itemId="item-1",
            persona="student",
            answer="42",
            reasoning="Worked it out",
            confidence=0.9,
        )
    ]


def test_initialize_names_the_missing_supabase_setting(monkeypatch):
    monkeypatch.setattr(storage_supabase, "_client", None)
    for setting in ("SUPABASE_URL", "SUPABASE_SERVICE_KEY", "SUPABASE_BUCKET"):
        monkeypatch.delenv(setting, raising=False)

    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        storage_supabase.initialize()


def test_supabase_errors_do_not_expose_provider_details(monkeypatch):
    class BrokenQuery:
        def select(self, _columns):
            return self

        def eq(self, _column, _value):
            return self

        def execute(self):
            raise RuntimeError("service-key-value-must-not-leak")

    class BrokenClient:
        def table(self, _name):
            return BrokenQuery()

    monkeypatch.setattr(storage_supabase, "_client", BrokenClient())

    with pytest.raises(storage_supabase.StorageError) as error:
        storage_supabase.get_runs("item-1")

    assert "service-key-value-must-not-leak" not in str(error.value)
