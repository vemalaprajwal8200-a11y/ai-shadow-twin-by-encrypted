"""Classifier tests use fake signals and never call Bedrock."""

from app.classifier import classify_item
from app.models import Item


def _item() -> Item:
    return Item(
        itemId="item-1",
        courseId="course-1",
        orderIndex=2,
        type="question",
        text="What is the result?",
        answerKey="42",
    )


def test_missing_prerequisite_when_full_context_improves_correctness():
    finding = classify_item(
        _item(),
        {
            "agreement_rate": 0.3,
            "correct_rate": 0.2,
            "cites_material": False,
            "counterfactual": {"correct_rate_full": 0.9},
        },
    )

    assert finding.label == "content_defect"
    assert finding.defectType == "missing_prerequisite"
    assert "Agreement: 30%" in finding.evidence


def test_agreed_wrong_answer_suggests_possible_key_error():
    finding = classify_item(
        _item(),
        {
            "agreement_rate": 0.9,
            "correct_rate": 0.1,
            "cites_material": True,
            "counterfactual": {"correct_rate_full": 0.1},
        },
    )

    assert finding.label == "content_defect"
    assert finding.defectType == "possible_key_error"


def test_partial_full_context_pass_is_a_medium_missing_prerequisite():
    finding = classify_item(
        _item(),
        {
            "agreement_rate": 0.3,
            "correct_rate": 0.2,
            "cites_material": False,
            "counterfactual": {"correct_rate_full": 0.8},
        },
    )

    assert finding.label == "content_defect"
    assert finding.defectType == "missing_prerequisite"
    assert finding.severity == "medium"


def test_low_agreement_even_with_full_context_suggests_ability_gap():
    finding = classify_item(
        _item(),
        {
            "agreement_rate": 0.2,
            "correct_rate": 0.1,
            "cites_material": False,
            "counterfactual": {"correct_rate_full": 0.2},
        },
    )

    assert finding.label == "ability_gap"
    assert finding.defectType == "ability_gap"


def test_other_signal_patterns_are_ok():
    finding = classify_item(
        _item(),
        {
            "agreement_rate": 0.9,
            "correct_rate": 0.9,
            "cites_material": True,
            "counterfactual": {"correct_rate_full": 1.0},
        },
    )

    assert finding.label == "ok"
    assert finding.severity == "low"