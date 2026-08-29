from fastapi import FastAPI
from pydantic import BaseModel, Field

from .model import FEATURES, infer, load
from .retrieval import retrieve

app = FastAPI(title="SIH25007 ML and Retrieval Service", version="1.0.0")


class RiskRequest(BaseModel):
    features: dict[str, float | int | None]


class RetrievalRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    limit: int = Field(default=5, ge=1, le=10)


@app.get("/health")
def health():
    _, metadata = load()
    return {"status": "ok", "modelVersion": metadata["modelVersion"]}


@app.post("/v1/amu-risk")
def amu_risk(request: RiskRequest):
    return infer(request.features)


@app.post("/v1/retrieve")
def rag_retrieve(request: RetrievalRequest):
    return {"chunks": retrieve(request.question, request.limit)}
