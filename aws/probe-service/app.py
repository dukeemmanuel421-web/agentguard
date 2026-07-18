import hmac
import os
import threading
import time

import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_ID=os.getenv('MODEL_ID','protectai/deberta-v3-base-prompt-injection-v2')
MODEL_REVISION=os.getenv('MODEL_REVISION','90c9989b1a342275dd0d1a95aad283c04e075671')
TOKEN=os.environ['PROBE_INTERNAL_TOKEN']
app=FastAPI(title='AgentGuard Activation Probe',docs_url=None,redoc_url=None)
torch.set_num_threads(max(1,int(os.getenv('TORCH_NUM_THREADS','2'))))
tokenizer=AutoTokenizer.from_pretrained(MODEL_ID,revision=MODEL_REVISION,local_files_only=True,trust_remote_code=False)
model=AutoModelForSequenceClassification.from_pretrained(MODEL_ID,revision=MODEL_REVISION,local_files_only=True,trust_remote_code=False,use_safetensors=True)
model.eval()
activations=[]
inference_lock=threading.Lock()
injection_index=int(model.config.label2id.get('INJECTION',1))
def capture(_module,_args,output): activations.append(output[0].detach().float().cpu())
model.base_model.encoder.layer[-1].register_forward_hook(capture)
class ProbeRequest(BaseModel): text:str=Field(min_length=1,max_length=50000)
@app.get('/health')
def health(): return {'status':'ready','model':MODEL_ID,'revision':MODEL_REVISION}
@app.post('/probe')
def probe(payload:ProbeRequest,authorization:str|None=Header(default=None)):
 supplied=authorization or ''
 if not hmac.compare_digest(supplied,f'Bearer {TOKEN}'): raise HTTPException(status_code=401,detail='Unauthorized')
 started=time.perf_counter()
 with inference_lock:
  activations.clear(); encoded=tokenizer(payload.text,truncation=True,max_length=512,return_tensors='pt')
  with torch.inference_mode(): logits=model(**encoded).logits
  probabilities=torch.softmax(logits,dim=-1)[0]
  classifier=float(probabilities[injection_index]); activation_energy=float(activations[-1].abs().mean()) if activations else 0.0
 calibrated=min(1.0,max(0.0,classifier*0.9+min(1.0,activation_energy/10)*0.1))
 findings=[]
 if calibrated>=0.5: findings=[{'severity':'critical' if calibrated>=0.85 else 'high','snippet':payload.text[:180],'reason':f'DeBERTa injection class and final-layer activation energy indicate anomalous instructional content ({activation_energy:.3f}).'}]
 return {'risk':round(calibrated,4),'rationale':f'DeBERTa injection probability {classifier:.3f}; activation energy {activation_energy:.3f}.','findings':findings,'model':MODEL_ID,'revision':MODEL_REVISION,'latency_ms':round((time.perf_counter()-started)*1000)}
