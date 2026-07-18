import os
import re
import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_ID=os.getenv('MODEL_ID','protectai/deberta-v3-base-prompt-injection-v2')
TOKEN=os.environ['PROBE_INTERNAL_TOKEN']
app=FastAPI(title='AgentGuard Activation Probe',docs_url=None,redoc_url=None)
tokenizer=AutoTokenizer.from_pretrained(MODEL_ID)
model=AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
model.eval()
activations=[]
def capture(_module,_args,output): activations.append(output[0].detach().float().cpu())
model.base_model.encoder.layer[-1].register_forward_hook(capture)
class ProbeRequest(BaseModel): text:str=Field(min_length=1,max_length=50000)
@app.get('/health')
def health(): return {'status':'ready','model':MODEL_ID}
@app.post('/probe')
def probe(payload:ProbeRequest,authorization:str|None=Header(default=None)):
 if authorization != f'Bearer {TOKEN}': raise HTTPException(status_code=401,detail='Unauthorized')
 activations.clear(); encoded=tokenizer(payload.text,truncation=True,max_length=512,return_tensors='pt')
 with torch.inference_mode(): logits=model(**encoded).logits
 probabilities=torch.softmax(logits,dim=-1)[0]; injection_index=1 if probabilities.numel()>1 else 0
 classifier=float(probabilities[injection_index]); activation_energy=float(activations[-1].abs().mean()) if activations else 0.0
 calibrated=min(1.0,max(0.0,classifier*0.9+min(1.0,activation_energy/10)*0.1))
 findings=[]
 if calibrated>=0.5: findings=[{'severity':'critical' if calibrated>=0.85 else 'high','snippet':payload.text[:180],'reason':f'DeBERTa injection class and final-layer activation energy indicate anomalous instructional content ({activation_energy:.3f}).'}]
 return {'risk':round(calibrated,4),'findings':findings,'model':MODEL_ID}
