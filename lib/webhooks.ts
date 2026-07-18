import { createHash } from 'node:crypto'
import { SendMessageCommand } from '@aws-sdk/client-sqs'
import { nanoid } from 'nanoid'
import { decryptProviderKey,type EncryptedSecret } from '@/lib/provider-crypto'
import type { ScanResult,TrustLevel } from '@/lib/contracts'
import { sqs } from '@/lib/aws'
import { listByWorkspace,putWorkspaceItem } from '@/lib/workspace'

export async function emitScanWebhooks(args:{workspaceId:string;traceId:string;source:TrustLevel;result:ScanResult}){
 if(args.workspaceId==='public'||!process.env.SQS_WEBHOOK_QUEUE_URL)return
 const eventTypes:string[]=[]
 if(args.result.blocked)eventTypes.push('scan.blocked')
 if(!args.result.blocked&&args.result.risk>=Number(process.env.WEBHOOK_ELEVATED_THRESHOLD||.5))eventTypes.push('risk.elevated')
 if(args.result.degraded)eventTypes.push('detector.degraded')
 if(!eventTypes.length)return
 const hooks=await listByWorkspace(args.workspaceId,'webhook')
 for(const type of eventTypes){
  const eventId=`evt_${nanoid(16)}`
  const payload=JSON.stringify({id:eventId,type,api_version:'2026-07-18',created_at:new Date().toISOString(),workspace_id:args.workspaceId,trace_id:args.traceId,livemode:true,data:{source:args.source,risk:args.result.risk,blocked:args.result.blocked,policy:args.result.policy,findings:args.result.findings.slice(0,12),degraded:args.result.degraded,provenance:args.result.provenance}})
  for(const hook of hooks.filter(item=>item.active&&item.events?.includes(type)&&item.secretEnc)){
   const deliveryId=`dlv_${nanoid(16)}`
   await putWorkspaceItem(args.workspaceId,'delivery',deliveryId,{eventId,webhookId:hook.id,traceId:args.traceId,eventType:type,status:'queued',attempts:0,payloadHash:createHash('sha256').update(payload).digest('hex'),createdAt:new Date().toISOString(),expiresAt:Math.floor(Date.now()/1000)+2592000})
   await sqs.send(new SendMessageCommand({QueueUrl:process.env.SQS_WEBHOOK_QUEUE_URL,MessageBody:JSON.stringify({deliveryId,eventId,workspaceId:args.workspaceId,webhookId:hook.id,url:hook.url,secret:decryptProviderKey(hook.secretEnc as EncryptedSecret),payload})}))
  }
 }
}
