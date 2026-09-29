"""Manually verify Supabase table access using temporary test rows."""

import os
import sys
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def main() -> int:
    required = ("SUPABASE_URL", "SUPABASE_SERVICE_KEY")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        print(f"FAIL: missing required setting {missing[0]}.")
        return 1

    course_id = f"check-{uuid4()}"
    item_id = f"check-{uuid4()}"
    run_id = f"check-{uuid4()}"
    client = None
    try:
        from supabase import create_client

        client = create_client(
            os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
        )
        client.table("courses").insert(
            {
                "course_id": course_id,
                "filename": "supabase-check.txt",
                "status": "check",
                "items_done": 0,
                "items_total": 1,
            }
        ).execute()
        client.table("items").insert(
            {
                "item_id": item_id,
                "course_id": course_id,
                "order_index": 1,
                "type": "slide",
                "text": "Supabase storage check",
            }
        ).execute()
        client.table("runs").insert(
            {
                "run_id": run_id,
                "item_id": item_id,
                "persona": "check",
                "answer": "ok",
                "reasoning": "Connectivity check",
                "confidence": 1.0,
            }
        ).execute()

        course = client.table("courses").select("course_id").eq(
            "course_id", course_id
        ).execute().data
        item = client.table("items").select("item_id").eq(
            "item_id", item_id
        ).execute().data
        run = client.table("runs").select("run_id").eq(
            "run_id", run_id
        ).execute().data
        if not course or not item or not run:
            raise RuntimeError("Test rows could not be read back.")
    except Exception:
        print("FAIL: Supabase insert/read check failed.")
        _delete_test_rows(client, course_id, item_id, run_id)
        return 1

    if not _delete_test_rows(client, course_id, item_id, run_id):
        return 1
    print("PASS: Supabase inserted, read, and deleted one course, item, and run.")
    return 0


def _delete_test_rows(client, course_id: str, item_id: str, run_id: str) -> bool:
    if client is None:
        return True
    try:
        client.table("runs").delete().eq("run_id", run_id).execute()
        client.table("items").delete().eq("item_id", item_id).execute()
        client.table("courses").delete().eq("course_id", course_id).execute()
        return True
    except Exception:
        print("FAIL: test-row cleanup failed; remove check-* rows in Supabase.")
        return False


if __name__ == "__main__":
    sys.exit(main())
