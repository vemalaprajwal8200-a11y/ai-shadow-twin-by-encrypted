"""Local JSON storage used by default during development."""

import json
from pathlib import Path

from app.models import Finding, Item, Run

STORE_PATH = Path(__file__).resolve().parents[1] / "data" / "store.json"


def _load() -> dict:
    if not STORE_PATH.exists():
        return {"items": {}, "runs": [], "findings": [], "courses": {}, "courseFiles": {}}
    data = json.loads(STORE_PATH.read_text(encoding="utf-8"))
    data.setdefault("items", {})
    data.setdefault("runs", [])
    data.setdefault("findings", [])
    data.setdefault("courses", {})
    data.setdefault("courseFiles", {})
    return data


def _save(data: dict) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STORE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def save_items(items: list[Item]) -> None:
    data = _load()
    for item in items:
        data["items"][item.itemId] = item.model_dump()
    if items:
        course_id = items[0].courseId
        item_count = sum(
            value["courseId"] == course_id for value in data["items"].values()
        )
        data["courses"][course_id] = {"itemsDone": 0, "itemsTotal": item_count}
    _save(data)


def get_items(course_id: str) -> list[Item]:
    data = _load()
    items = [
        Item.model_validate(value)
        for value in data["items"].values()
        if value["courseId"] == course_id
    ]
    return sorted(items, key=lambda item: item.orderIndex)


def get_item(item_id: str) -> Item | None:
    value = _load()["items"].get(item_id)
    return Item.model_validate(value) if value else None


def save_run(run: Run) -> None:
    data = _load()
    data["runs"].append(run.model_dump())
    _save(data)


def get_runs(item_id: str) -> list[Run]:
    return [
        Run.model_validate(value)
        for value in _load()["runs"]
        if value["itemId"] == item_id
    ]


def save_finding(finding: Finding) -> None:
    data = _load()
    data["findings"].append(finding.model_dump())
    _save(data)


def get_findings(course_id: str) -> list[Finding]:
    data = _load()
    course_item_ids = {
        item_id
        for item_id, item in data["items"].items()
        if item["courseId"] == course_id
    }
    return [
        Finding.model_validate(value)
        for value in data["findings"]
        if value["itemId"] in course_item_ids
    ]


def update_course_status(course_id: str, items_done: int) -> dict:
    data = _load()
    status = data["courses"].get(course_id)
    if status is None:
        item_count = sum(
            item["courseId"] == course_id for item in data["items"].values()
        )
        status = {"itemsDone": 0, "itemsTotal": item_count}
        data["courses"][course_id] = status
    status["itemsDone"] = items_done
    _save(data)
    return status


def get_course_status(course_id: str) -> dict:
    data = _load()
    return data["courses"].get(
        course_id, {"itemsDone": 0, "itemsTotal": len(get_items(course_id))}
    )


def save_course(course_id: str, filename: str, items_total: int) -> None:
    data = _load()
    data["courseFiles"][course_id] = {"filename": filename}
    data["courses"][course_id] = {"itemsDone": 0, "itemsTotal": items_total}
    _save(data)
