from __future__ import annotations
import json,time
from urllib.request import Request,urlopen
from urllib.error import HTTPError
class AgentGuardError(RuntimeError):
    pass
class AgentGuard:
    def __init__(self,api_key:str,base_url:str='https://agentguard.example.com',timeout:float=15,retries:int=2):
        self.api_key,self.base_url,self.timeout,self.retries=api_key,base_url.rstrip('/'),timeout,retries
    def _request(self,path:str,payload:dict|None=None):
        for attempt in range(self.retries+1):
            try:
                body=None if payload is None else json.dumps(payload).encode()
                request=Request(self.base_url+path,data=body,method='GET' if payload is None else 'POST',headers={'Authorization':f'Bearer {self.api_key}','Content-Type':'application/json'})
                with urlopen(request,timeout=self.timeout) as response:return json.load(response)
            except HTTPError as error:
                if error.code<500:raise AgentGuardError(error.read().decode()) from error
            except OSError:
                pass
            if attempt<self.retries:time.sleep(.25*(2**attempt))
        raise AgentGuardError('AgentGuard unavailable; fail closed.')
    def scan(self,text:str,source:str='UNKNOWN'):return self._request('/api/v1/scan',{'text':text,'source':source})
    def check_action(self,action:str,context:str=''):return self._request('/api/v1/check-action',{'action':action,'context':context})
    def submit_batch(self,key:str):return self._request('/api/v1/scan-batch',{'key':key})
    def job(self,job_id:str):return self._request(f'/api/v1/jobs/{job_id}')
