FROM python:3.12-slim
ARG MODEL_ID=protectai/deberta-v3-base-prompt-injection-v2
ARG MODEL_REVISION=90c9989b1a342275dd0d1a95aad283c04e075671
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HF_HOME=/models MODEL_ID=${MODEL_ID} MODEL_REVISION=${MODEL_REVISION}
WORKDIR /service
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
RUN python -c "import os; from transformers import AutoTokenizer,AutoModelForSequenceClassification; m=os.environ['MODEL_ID']; r=os.environ['MODEL_REVISION']; AutoTokenizer.from_pretrained(m,revision=r,trust_remote_code=False); AutoModelForSequenceClassification.from_pretrained(m,revision=r,trust_remote_code=False,use_safetensors=True)" \
 && chmod -R a+rX /models
USER 65532
EXPOSE 8080
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","8080","--workers","1"]
