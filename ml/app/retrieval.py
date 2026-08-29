import json
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ROOT = Path(__file__).resolve().parents[2]


def approved_chunks():
    chunks = []
    for path in sorted((ROOT / "docs" / "research").glob("*.md")):
        text = path.read_text(encoding="utf-8")
        for index, part in enumerate(p.strip() for p in text.split("\n\n") if len(p.strip()) > 80):
            chunks.append({
                "id": f"{path.stem}:{index}", "title": path.stem.replace("-", " ").title(),
                "content": part, "contentType": "PROJECT_APPROVED_RESEARCH",
                "sourceOrganization": "SIH25007 research synthesis",
                "sourceReference": str(path.relative_to(ROOT)).replace("\\", "/"),
                "jurisdiction": "AS_STATED_IN_CHUNK",
            })
    for path in sorted((ROOT / "data" / "reference").glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for record in payload.get("records", []):
            chunks.append({
                "id": record.get("id", f"{path.stem}:{len(chunks)}"),
                "title": record.get("canonical_name", record.get("title", record.get("id", path.stem))),
                "content": json.dumps(record, ensure_ascii=False), "contentType": "REFERENCE_RECORD",
                "sourceOrganization": record.get("source_organization", "See provenance fields"),
                "sourceReference": str(path.relative_to(ROOT)).replace("\\", "/"),
                "jurisdiction": record.get("jurisdiction", "NOT_SPECIFIED"),
            })
    return chunks


def retrieve(question, limit=5):
    chunks = approved_chunks()
    corpus = [item["content"] for item in chunks]
    matrix = TfidfVectorizer(stop_words="english", ngram_range=(1, 2)).fit_transform(corpus + [question])
    scores = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
    ranked = [int(i) for i in scores.argsort()[::-1] if scores[i] > 0][:limit]
    return [{**chunks[i], "score": round(float(scores[i]), 4)} for i in ranked]
