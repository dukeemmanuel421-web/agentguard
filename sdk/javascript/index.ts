export type TrustLevel='USER_PROMPT'|'TRUSTED_TOOL'|'TOOL_OUTPUT'|'WEB_PAGE'|'DOCUMENT'|'MCP_OUTPUT'|'UNKNOWN'
export type ScanResponse={blocked:boolean;risk:number;sanitized_text:string;findings:{detector:string;severity:string;snippet:string;reason:string}[];policy?:{reason:string}}
export type DocumentScanResponse=ScanResponse&{document:{characters:number;chunks_scanned:number}}
export type CheckActionInput={tool_call:Record<string,unknown>;reasoning_trace:string[];trusted_context:string[]}
export type BatchInput={s3Key:string}|{items:{text:string;source:TrustLevel}[]}
export type AgentGuardOptions={apiKey?:string;baseUrl?:string;timeoutMs?:number;documentTimeoutMs?:number;retries?:number}

const SINGLE_SCAN_LIMIT=50000

export class AgentGuardError extends Error{
  constructor(message:string,public status:number){super(message)}
}

export class AgentGuardBlockedError extends AgentGuardError{
  constructor(message:string,public stage:'model-input'|'tool-call'|'tool-output',public risk:number,public decision:unknown){
    super(message,403)
  }
}

export class AgentGuard{
  private options:AgentGuardOptions

  constructor(options:AgentGuardOptions={}){
    this.options=options
  }

  private async request<T>(path:string,init:RequestInit,timeoutMs=this.options.timeoutMs??15000){
    const attempts=this.options.retries??2
    for(let i=0;i<=attempts;i++){
      const controller=new AbortController()
      const timer=setTimeout(()=>controller.abort(),timeoutMs)
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

  scanDocument(text:string,source:TrustLevel='DOCUMENT'){
    return this.request<DocumentScanResponse>(
      '/api/v1/scan-document',
      {method:'POST',body:JSON.stringify({text,source})},
      this.options.documentTimeoutMs??300000,
    )
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

export class AgentGuardMiddleware{
  constructor(private client=new AgentGuard()){}

  async beforeModel(content:string,source:TrustLevel='USER_PROMPT'){
    const decision=content.length>SINGLE_SCAN_LIMIT
      ?await this.client.scanDocument(content,source)
      :await this.client.scan(content,source)
    if(decision.blocked)throw new AgentGuardBlockedError(decision.policy?.reason||'AgentGuard blocked model input.','model-input',decision.risk,decision)
    return decision
  }

  async beforeTool(name:string,arguments_:Record<string,unknown>,trustedContext:string[]=[]){
    const decision=await this.client.checkAction({
      tool_call:{name,arguments:arguments_},
      reasoning_trace:[],
      trusted_context:trustedContext,
    })
    if(!decision.allowed)throw new AgentGuardBlockedError(decision.reason||`AgentGuard blocked ${name}.`,'tool-call',decision.risk,decision)
    return decision
  }

  async afterTool<T>(output:T):Promise<T>{
    const serialized=typeof output==='string'?output:JSON.stringify(output)
    const decision=serialized.length>SINGLE_SCAN_LIMIT
      ?await this.client.scanDocument(serialized,'TOOL_OUTPUT')
      :await this.client.scan(serialized,'TOOL_OUTPUT')
    if(decision.blocked)throw new AgentGuardBlockedError(decision.policy?.reason||'AgentGuard blocked tool output.','tool-output',decision.risk,decision)
    if(typeof output==='string')return decision.sanitized_text as T
    if(decision.sanitized_text!==serialized){
      try{return JSON.parse(decision.sanitized_text) as T}catch{throw new AgentGuardBlockedError('Sanitized structured output could not be reconstructed safely.','tool-output',decision.risk,decision)}
    }
    return output
  }

  wrapTool<TArgs extends unknown[],TResult>(name:string,execute:(...args:TArgs)=>Promise<TResult>|TResult,trustedContext:string[]=[]){
    return async(...args:TArgs)=>{
      await this.beforeTool(name,{args},trustedContext)
      return this.afterTool(await execute(...args))
    }
  }
}
