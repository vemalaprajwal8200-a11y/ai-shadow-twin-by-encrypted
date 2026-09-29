"""Compute simple agreement and material-use signals for one item."""

import re

from app.models import Item, Run
from app.storage import get_items
from app.twin import twin_run


def _normalize(text: str) -> str:
    without_punctuation = re.sub(r"[^\w\s]", "", text.lower())
    return " ".join(without_punctuation.split())


def _correct_rate(runs: list[Run], answer_key: str | None) -> float | None:
    if answer_key is None or not runs:
        return None
    expected = _normalize(answer_key)
    correct = sum(_normalize(run.answer) == expected for run in runs)
    return correct / len(runs)


def _cites_earlier_material(item: Item, runs: list[Run]) -> bool:
    earlier_text = " ".join(
        previous.text
        for previous in get_items(item.courseId)
        if previous.orderIndex < item.orderIndex
    )
    concepts = {word for word in _normalize(earlier_text).split() if len(word) >= 4}
    if not concepts:
        return False
    return any(
        concepts.intersection(
            word for word in _normalize(run.reasoning).split() if len(word) >= 4
        )
        for run in runs
    )


def compute_signals(item: Item, runs: list[Run]) -> dict:
    """Compare taught-only runs and three full-course counterfactual runs."""
    normalized_answers = [_normalize(run.answer) for run in runs]
    if normalized_answers:
        most_common_count = max(normalized_answers.count(answer) for answer in set(normalized_answers))
        agreement_rate = most_common_count / len(normalized_answers)
    else:
        agreement_rate = None

    full_runs = []
    for persona in ("average", "weak", "strong"):
        try:
            full_runs.append(
                twin_run(item.itemId, persona, context_mode="full_course", persist=False)
            )
        except Exception:
            continue
    correct_rate_full = _correct_rate(full_runs, item.answerKey)
    return {
        "agreement_rate": agreement_rate,
        "correct_rate": _correct_rate(runs, item.answerKey),
        "cites_material": _cites_earlier_material(item, runs),
        "counterfactual": {
            "correct_rate_full": correct_rate_full,
            "run_count": len(full_runs),
        },
    }