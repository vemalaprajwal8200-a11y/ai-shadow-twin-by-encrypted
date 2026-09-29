"""Generate student-twin runs from taught-only or full-course context."""

from concurrent.futures import ThreadPoolExecutor, as_completed
from uuid import uuid4

from app.engine.bedrock_client import ask
from app.models import Run
from app.storage import get_item, get_items, save_run

PERSONAS = {
    "average": ("Respond like an average student who understands core ideas.", 0.3),
    "weak": ("Respond like a student who struggles with unfamiliar ideas.", 0.7),
    "strong": ("Respond like a student who understands the material deeply.", 0.5),
}
RUNS_PER_PERSONA = 5


def twin_run(
    item_id: str,
    persona: str,
    context_mode: str = "taught_only",
    *,
    persist: bool = True,
) -> Run:
    item = get_item(item_id)
    if item is None:
        raise ValueError(f"Item not found: {item_id}")
    if persona not in PERSONAS:
        raise ValueError(f"Unknown persona: {persona}")
    if context_mode not in {"taught_only", "full_course"}:
        raise ValueError(f"Unknown context mode: {context_mode}")

    instruction, temperature = PERSONAS[persona]
    course_items = get_items(item.courseId)
    if context_mode == "taught_only":
        context_items = [
            previous for previous in course_items
            if previous.orderIndex < item.orderIndex
        ]
    else:
        context_items = course_items
    context = "\n\n".join(previous.text for previous in context_items)
    if not context:
        context = "No course material was provided."
    prompt = (
        f"{instruction}\n\n"
        "You are a student who has only seen the material below. Answer the final item, "
        "explain your reasoning, and rate your confidence from 0 to 1. Reply as JSON "
        "with keys: answer, reasoning, confidence.\n\n"
        f"Material seen before the final item:\n{context}\n\n"
        f"Final item:\n{item.text}"
    )
    answer = ask(prompt, temperature=temperature)
    run = Run(
        runId=str(uuid4()),
        itemId=item.itemId,
        persona=persona,
        answer=str(answer["answer"]),
        reasoning=str(answer["reasoning"]),
        confidence=float(answer["confidence"]),
    )
    if persist:
        save_run(run)
    return run


def run_item_full(item_id: str) -> list[Run]:
    """Generate up to 15 runs, skipping failures and saving successes serially."""
    if get_item(item_id) is None:
        raise ValueError(f"Item not found: {item_id}")

    successful_runs = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(twin_run, item_id, persona, persist=False)
            for persona in PERSONAS
            for _ in range(RUNS_PER_PERSONA)
        ]
        for future in as_completed(futures):
            try:
                successful_runs.append(future.result())
            except Exception:
                continue

    for run in successful_runs:
        save_run(run)
    return successful_runs