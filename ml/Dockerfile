FROM python:3.12-slim
WORKDIR /app
COPY ml/requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
COPY ml ./ml
COPY docs/research ./docs/research
COPY data/reference ./data/reference
WORKDIR /app/ml
RUN python training/train.py
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
