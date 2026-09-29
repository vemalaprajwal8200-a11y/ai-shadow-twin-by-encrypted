"""Ask the judge-profile model for a suggested item rewrite."""

from app.engine.gemini_client import ask
from app.models import Finding, Item


def suggest_rewrite(item: Item, finding: Finding) -> str | None:
    prompt = (
        "Suggest a concise rewrite that addresses the finding. Return JSON only "
        "with a suggestedRewrite string. Do not add unsupported facts.\n\n"
        f"Item text:\n{item.text}\n\n"
        f"Finding evidence:\n{finding.evidence}"
    )
    result = ask(prompt, temperature=0.2)
    rewrite = result.get("suggestedRewrite")
    return str(rewrite) if rewrite else None