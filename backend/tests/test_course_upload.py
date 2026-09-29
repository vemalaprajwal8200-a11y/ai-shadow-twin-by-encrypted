import asyncio

from app import main
from app.models import Item


def test_frontend_dev_server_is_allowed_by_cors():
    cors = next(
        middleware for middleware in main.app.user_middleware
        if getattr(middleware, "kwargs", {}).get("allow_methods")
    )
    assert "http://127.0.0.1:3000" in cors.kwargs["allow_origins"]
    assert "http://127.0.0.1:4173" in cors.kwargs["allow_origins"]


def test_supabase_course_is_saved_before_its_items(monkeypatch):
    calls = []

    class FakeUpload:
        filename = "course.pdf"
        content_type = "application/pdf"

        async def read(self, _size):
            return b"pdf contents"

    item = Item(
        itemId="item-1",
        courseId="course-1",
        orderIndex=0,
        type="slide",
        text="Course content",
    )
    monkeypatch.setattr(main, "STORAGE_BACKEND", "supabase")
    monkeypatch.setattr(main, "parse_pdf", lambda _path, _course_id: [item])
    monkeypatch.setattr(main, "upload_course_file", lambda *_args: None)
    monkeypatch.setattr(main, "save_course", lambda *_args: calls.append("course"))
    monkeypatch.setattr(main, "save_items", lambda *_args: calls.append("items"))

    result = asyncio.run(main.create_course(FakeUpload()))

    assert result["itemCount"] == 1
    assert calls == ["course", "items"]
