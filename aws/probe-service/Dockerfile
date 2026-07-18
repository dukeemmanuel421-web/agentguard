FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HF_HOME=/models
WORKDIR /service
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
RUN python -c "from transformers import AutoTokenizer,AutoModelForSequenceClassification; m='protectai/deberta-v3-base-prompt-injection-v2'; AutoTokenizer.from_pretrained(m); AutoModelForSequenceClassification.from_pretrained(m)"
USER 65532
EXPOSE 8080
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","8080","--workers","1"]
