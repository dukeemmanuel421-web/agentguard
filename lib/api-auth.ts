import { createHash, timingSafeEqual } from 'node:crypto'
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo,tables } from '@/lib/aws'
export const hashKey=(key:string)=>createHash('sha256').update(key).digest('hex')
export async function authenticateApiKey(request:Request){
 const raw=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
 if(!raw?.startsWith('ag_live_')) return null
 const hash=hashKey(raw); const item=await dynamo.send(new GetCommand({TableName:tables.apiKeys,Key:{keyHash:hash},ConsistentRead:true}))
 if(!item.Item||item.Item.revokedAt) return null
 const expected=Buffer.from(item.Item.keyHash); const actual=Buffer.from(hash)
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual)) return null
 const minute=Math.floor(Date.now()/60000); const usageKey=`${hash}:${minute}`
 try { await dynamo.send(new UpdateCommand({TableName:tables.usage,Key:{id:usageKey},UpdateExpression:'ADD #count :one SET #expiresAt = :ttl, #userId = :uid',ConditionExpression:'attribute_not_exists(#count) OR #count < :limit',ExpressionAttributeNames:{'#count':'count','#expiresAt':'expiresAt','#userId':'userId'},ExpressionAttributeValues:{':one':1,':limit':Number(process.env.API_RATE_LIMIT_PER_MINUTE||60),':ttl':Math.floor(Date.now()/1000)+180,':uid':item.Item.userId}})); return item.Item
 } catch(error){ if((error as {name?:string}).name==='ConditionalCheckFailedException') return {rateLimited:true}; throw error }
}
