import {createHmac} from 'node:crypto'
import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
import {DynamoDBDocumentClient,UpdateCommand} from '@aws-sdk/lib-dynamodb'

const ddb=DynamoDBDocumentClient.from(new DynamoDBClient({}))

async function deliver(message){
 const timestamp=Math.floor(Date.now()/1000)
 const signature=createHmac('sha256',message.secret).update(`${timestamp}.${message.payload}`).digest('hex')
 const started=Date.now()
 let statusCode=0,error
 try{
  const response=await fetch(message.url,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(8000),headers:{'content-type':'application/json','user-agent':'AgentGuard-Webhooks/1.0','agentguard-signature':`t=${timestamp},v1=${signature}`,'agentguard-trace-id':message.traceId||'','agentguard-event-id':message.eventId,'agentguard-delivery-id':message.deliveryId},body:message.payload})
  statusCode=response.status
  if(response.status<200||response.status>=300)throw new Error(`Webhook returned ${response.status}`)
 }catch(cause){error=cause instanceof Error?cause.message:'Webhook delivery failed'}
 const values={':status':error?'retrying':'delivered',':at':new Date().toISOString(),':code':statusCode,':duration':Date.now()-started,':expires':Math.floor(Date.now()/1000)+2592000,':one':1,...(error?{':error':error}:{})}
 await ddb.send(new UpdateCommand({TableName:process.env.PLATFORM_TABLE,Key:{pk:`WORKSPACE#${message.workspaceId}`,sk:`DELIVERY#${message.deliveryId}`},UpdateExpression:'SET #status=:status,lastAttemptAt=:at,lastStatusCode=:code,lastDurationMs=:duration'+(error?',lastError=:error,expiresAt=:expires':',deliveredAt=:at,expiresAt=:expires')+' ADD attempts :one',ExpressionAttributeNames:{'#status':'status'},ExpressionAttributeValues:values}))
 if(error)throw new Error(error)
}

export async function handler(event){
 const failures=[]
 for(const record of event.Records){
  try{await deliver(JSON.parse(record.body))}
  catch{failures.push({itemIdentifier:record.messageId})}
 }
 return{batchItemFailures:failures}
}
