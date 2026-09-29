"""Pydantic data models shared by the local-first backend."""

from typing import Literal

from pydantic import BaseModel, Field


class Item(BaseModel):
    itemId: str
    courseId: str
    orderIndex: int
    type: Literal["slide", "question"]
    text: str
    answerKey: str | None = None


class Run(BaseModel):
    runId: str
    itemId: str
    persona: str
    answer: str
    reasoning: str
    confidence: float = Field(ge=0, le=1)


class Finding(BaseModel):
    itemId: str
    label: Literal["content_defect", "ability_gap", "ok"]
    defectType: str
    severity: str
    evidence: str
    suggestedRewrite: str | None = None