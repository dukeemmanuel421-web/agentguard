export type TrustLevel='USER_PROMPT'|'TRUSTED_TOOL'|'TOOL_OUTPUT'|'WEB_PAGE'|'DOCUMENT'|'MCP_OUTPUT'|'UNKNOWN'
export type ScanResponse={blocked:boolean;risk:number;sanitized_text:string;findings:{detector:string;severity:string;snippet:string;reason:string}[]}
export type CheckActionInput={tool_call:Record<string,unknown>;reasoning_trace:string[];trusted_context:string[]}
export type BatchInput={s3Key:string}|{items:{text:string;source:TrustLevel}[]}
export type AgentGuardOptions={apiKey?:string;baseUrl?:string;timeoutMs?:number;retries?:number}

export class AgentGuardError extends Error{
  constructor(message:string,public status:number){super(message)}
}

export class AgentGuard{
  private options:AgentGuardOptions

  constructor(options:AgentGuardOptions={}){
    this.options=options
  }

  private async request<T>(path:string,init:RequestInit){
    const attempts=this.options.retries??2
    for(let i=0;i<=attempts;i++){
      const controller=new AbortController()
      const timer=setTimeout(()=>controller.abort(),this.options.timeoutMs??15000)
      try{
        const headers:Record<string,string>={'content-type':'application/json'}
        if(this.options.apiKey)headers.authorization=`Bearer ${this.options.apiKey}`
        const response=await fetch(`${this.options.baseUrl||'http://localhost:3000'}${path}`,{
          ...init,
          headers:{...headers,...init.headers},
          signal:controller.signal,
        })
        if(response.ok)return response.json() as Promise<T>
        if(response.status<500){
          const payload=await response.json().catch(()=>({error:'AgentGuard request failed'})) as {error?:string}
          throw new AgentGuardError(payload.error||'AgentGuard request failed',response.status)
        }
      }catch(error){
        if(error instanceof AgentGuardError)throw error
      }finally{
        clearTimeout(timer)
      }
      if(i<attempts)await new Promise(resolve=>setTimeout(resolve,250*2**i))
    }
    throw new AgentGuardError('AgentGuard unavailable; fail closed.',503)
  }

  private requireApiKey(){
    if(!this.options.apiKey)throw new AgentGuardError('This endpoint requires an API key.',401)
  }

  scan(text:string,source:TrustLevel='UNKNOWN'){
    return this.request<ScanResponse>('/api/v1/scan',{method:'POST',body:JSON.stringify({text,source})})
  }

  checkAction(input:CheckActionInput){
    return this.request<{allowed:boolean;risk:number;reason:string}>('/api/v1/check-action',{method:'POST',body:JSON.stringify(input)})
  }

  submitBatch(input:BatchInput){
    this.requireApiKey()
    return this.request<{jobId:string}>('/api/v1/scan-batch',{method:'POST',body:JSON.stringify(input)})
  }

  job(id:string){
    this.requireApiKey()
    return this.request<{status:string;result?:unknown}>(`/api/v1/jobs/${id}`,{method:'GET'})
  }
}
