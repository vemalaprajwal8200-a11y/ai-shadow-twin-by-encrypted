"""Rule-based v1 classifier for course-item findings."""

from app.models import Finding, Item

THRESHOLDS = {
    "low_agreement": 0.5,
    "high_agreement": 0.8,
    "low_correct_rate": 0.5,
    "full_context_pass_rate": 0.8,
    "high_correct_rate": 0.9,
}


def _percent(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.0%}"


def classify_item(item: Item, signals: dict) -> Finding:
    """Apply the initial decision rules and include their measured evidence."""
    agreement = signals.get("agreement_rate")
    correct = signals.get("correct_rate")
    counterfactual = signals.get("counterfactual", {})
    correct_full = counterfactual.get("correct_rate_full")

    evidence = (
        f"Agreement: {_percent(agreement)}; taught-only correct: {_percent(correct)}; "
        f"full-course correct: {_percent(correct_full)}; "
        f"cites earlier material: {'yes' if signals.get('cites_material') else 'no'}."
    )

    if (
        agreement is not None
        and agreement < THRESHOLDS["low_agreement"]
        and correct is not None
        and correct < THRESHOLDS["low_correct_rate"]
        and correct_full is not None
        and correct_full >= THRESHOLDS["full_context_pass_rate"]
    ):
        label, defect_type = "content_defect", "missing_prerequisite"
        severity = "high" if correct_full >= THRESHOLDS["high_correct_rate"] else "medium"
    elif (
        correct is not None
        and correct < THRESHOLDS["low_correct_rate"]
        and agreement is not None
        and agreement >= THRESHOLDS["high_agreement"]
    ):
        label, defect_type = "content_defect", "possible_key_error"
        severity = "high"
    elif (
        agreement is not None
        and agreement < THRESHOLDS["low_agreement"]
        and correct_full is not None
        and correct_full < THRESHOLDS["low_correct_rate"]
    ):
        label, defect_type = "ability_gap", "ability_gap"
        severity = "high" if correct_full == 0 else "medium"
    else:
        label, defect_type, severity = "ok", "none", "low"

    return Finding(
        itemId=item.itemId,
        label=label,
        defectType=defect_type,
        severity=severity,
        evidence=evidence,
    )