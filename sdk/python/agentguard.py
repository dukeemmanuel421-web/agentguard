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
    def check_action(self,tool_call:dict,reasoning_trace:list[str]|None=None,trusted_context:list[str]|None=None):return self._request('/api/v1/check-action',{'tool_call':tool_call,'reasoning_trace':reasoning_trace or [],'trusted_context':trusted_context or []})
    def submit_batch(self,*,s3_key:str|None=None,items:list[dict]|None=None):
        if (s3_key is None)==(items is None):raise ValueError('Provide exactly one of s3_key or items')
        return self._request('/api/v1/scan-batch',{'s3Key':s3_key} if s3_key is not None else {'items':items})
    def job(self,job_id:str):return self._request(f'/api/v1/jobs/{job_id}')
