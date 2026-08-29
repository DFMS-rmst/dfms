# Smart Advisor and RAG architecture

## Two-path grounding

Static knowledge is read only from `docs/research/` and provenance-bearing JSON under `data/reference/`. Paragraphs and individual records become chunks retaining title, source/reference path, organization, jurisdiction, content type, and similarity score. Random blogs are never ingested.

For this small reproducible corpus, local TF-IDF cosine retrieval in the private FastAPI service was selected. It requires no cloud vector database, has deterministic behavior, is easy to rebuild in Docker, and can return no result for unrelated terms. It is less semantically capable than embedding models; a future swap can preserve the retrieval contract.

Mutable MySQL content is never embedded. Express separately loads only the explicitly scoped farm/animal context after RBAC: current persisted eligibility evidence, treatment/administration history, certificates, existing AMU summary/trend, and ML result. This structured context plus retrieved chunks goes to the configured provider.

## Provider abstraction and failure

`OpenAiCompatibleProvider` is behind a backend service boundary and configured by `LLM_PROVIDER`, `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL`. No key reaches React or FastAPI. With no key or provider failure, the API returns a clear 503 and does not fabricate an answer. Additional providers can implement the same `answer({messages})` contract.

The system prompt forbids diagnosis, prescription/dose invention, withdrawal invention, eligibility override, independent milk-safety claims, laboratory/residue claims, and presenting anomaly as proven misuse. Deterministic live records are labelled authoritative. ML explanations receive the actual feature vector and contributing indicators.

Conversation/message rows are owned by one user and contain only necessary question, answer, source projection, context-type labels, and timestamps. They are not veterinary records and are never shared across users. Authorization precedes every live-data load and every LLM call.
