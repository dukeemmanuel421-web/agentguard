import { nanoid } from 'nanoid'

const valid=/^tr_[A-Za-z0-9_-]{12,64}$/
export function resolveTraceId(request:Request){
 const supplied=request.headers.get('x-agentguard-trace-id')
 return supplied&&valid.test(supplied)?supplied:`tr_${nanoid(16)}`
}
