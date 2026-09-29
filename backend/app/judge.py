"""Add a Gemini second opinion without replacing the rules label."""

import json

from app.engine.gemini_client import ask
from app.models import Finding, Item, Run


def add_judge_evidence(
    item: Item, signals: dict, runs: list[Run], finding: Finding
) -> Finding:
    """Ask for a second opinion and retain the original rules classification."""
    sample_reasonings = [run.reasoning for run in runs[:3]]
    prompt = (
        "Review this item and its analysis as a second opinion. Return JSON only "
        "with keys label, defectType, explanation. Allowed labels are content_defect, "
        "ability_gap, and ok.\n\n"
        f"Item text:\n{item.text}\n\n"
        f"Signals:\n{json.dumps(signals, ensure_ascii=False)}\n\n"
        f"Sample student reasoning:\n{json.dumps(sample_reasonings, ensure_ascii=False)}"
    )
    judge_result = ask(prompt, temperature=0.1)
    judge_label = judge_result.get("label")
    disagreement = judge_label != finding.label
    evidence = (
        f"{finding.evidence} Judge second opinion: "
        f"{json.dumps(judge_result, ensure_ascii=False)}."
    )
    if disagreement:
        evidence += (
            f" Judge label {judge_label!r} disagrees with rules label "
            f"{finding.label!r}; kept the rules label."
        )
    return finding.model_copy(update={"evidence": evidence})