import { nanoid } from 'nanoid'
import { GetCommand,PutCommand,QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo,tables } from '@/lib/aws'

export type Role='owner'|'admin'|'developer'|'viewer'
export type WorkspaceContext={id:string;name:string;role:Role;userId:string}
export async function getWorkspace(user:{id?:string|null;email?:string|null;name?:string|null}):Promise<WorkspaceContext>{
 if(!user.id)throw new Error('Unauthorized')
 const membership=await dynamo.send(new QueryCommand({TableName:tables.platform,IndexName:'byUser',KeyConditionExpression:'userId=:userId',ExpressionAttributeValues:{':userId':user.id},Limit:1}))
 if(membership.Items?.[0])return {id:membership.Items[0].workspaceId,name:membership.Items[0].workspaceName,role:membership.Items[0].role,userId:user.id}
 const id=`ws_${nanoid(12)}`;const name=user.name?.trim()||user.email?.split('@')[0]||'Personal workspace';const item={pk:`WORKSPACE#${id}`,sk:`MEMBER#${user.id}`,type:'membership',workspaceId:id,workspaceName:name,userId:user.id,email:user.email,role:'owner',createdAt:new Date().toISOString()}
 await dynamo.send(new PutCommand({TableName:tables.platform,Item:item,ConditionExpression:'attribute_not_exists(pk)'}));return {id,name,role:'owner',userId:user.id}
}
export function can(role:Role,action:'read'|'write'|'admin'){return action==='read'||(action==='write'&&role!=='viewer')||(action==='admin'&&(role==='owner'||role==='admin'))}
export async function listByWorkspace(workspaceId:string,type:string){const out=await dynamo.send(new QueryCommand({TableName:tables.platform,KeyConditionExpression:'pk=:pk',ExpressionAttributeValues:{':pk':`WORKSPACE#${workspaceId}`}}));return (out.Items||[]).filter(item=>item.type===type)}
export async function putWorkspaceItem(workspaceId:string,type:string,id:string,data:Record<string,unknown>){const item={pk:`WORKSPACE#${workspaceId}`,sk:`${type.toUpperCase()}#${id}`,workspaceId,type,id,...data,updatedAt:new Date().toISOString()};await dynamo.send(new PutCommand({TableName:tables.platform,Item:item}));return item}
export async function getWorkspaceItem(workspaceId:string,type:string,id:string){const out=await dynamo.send(new GetCommand({TableName:tables.platform,Key:{pk:`WORKSPACE#${workspaceId}`,sk:`${type.toUpperCase()}#${id}`}}));return out.Item}
