from fastapi import FastAPI
from fastapi import HTTPException
from pydantic import BaseModel

from app.engine.bedrock_client import invoke_json

app = FastAPI(title="AI Shadow-Twin API")

@app.get("/health")
def health():
    return {"status": "ok"}


class TwinAskRequest(BaseModel):
    question: str


@app.post("/twin/ask")
def ask_twin(request: TwinAskRequest):
    try:
        return invoke_json(
            system="You are a student who has only seen the material provided. Reply ONLY with valid JSON.",
            user=(
                "Answer the following question as JSON with keys answer, reasoning, "
                "and confidence (0 to 1):\n\n"
                f"{request.question}"
            ),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Bedrock returned invalid JSON: {exc}",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Bedrock configuration error: {exc}",
        ) from exc