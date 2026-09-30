from app import analysis_service


def test_student_response_falls_back_when_ai_unconfigured(monkeypatch):
    monkeypatch.setattr(
        analysis_service,
        "invoke_json",
        lambda **kwargs: (_ for _ in ()).throw(RuntimeError("Missing required Gemini setting: GEMINI_API_KEY")),
    )

    item = {"content_text": "What is 2 + 2?", "answer_key": "4"}
    persona = {"name": "average", "prompt": "Answer as an average student."}

    result = analysis_service._student_response(item, "Previous context.", persona)

    assert result["answer"]
    assert result["confidence"] >= 0.0
    assert result["reasoning"]
