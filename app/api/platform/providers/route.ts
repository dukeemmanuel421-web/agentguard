import { NextResponse } from 'next/server'
import { encryptProviderKey } from '@/lib/provider-crypto'
import { getProviderStatus, type ProviderMode, type ProviderSettings } from '@/lib/providers'
import { can,getWorkspaceItem,putWorkspaceItem } from '@/lib/workspace'
import { assertSameOrigin,getSessionWorkspace,unauthorized } from '@/lib/tenant'

export async function GET(){
 const workspace=await getSessionWorkspace();if(!workspace)return unauthorized()
 return NextResponse.json({...await getProviderStatus(workspace.id),canManage:can(workspace.role,'admin')})
}
export async function POST(request:Request){
 const workspace=await getSessionWorkspace();if(!workspace)return unauthorized();if(!assertSameOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});if(!can(workspace.role,'admin'))return NextResponse.json({error:'Admin access required'},{status:403})
 const body=await request.json() as {mode?:ProviderMode;openaiKey?:string;openrouterKey?:string;openaiModel?:string;openrouterModel?:string;removeOpenai?:boolean;removeOpenrouter?:boolean}
 if(body.mode&&!['auto','openai','openrouter','aws'].includes(body.mode))return NextResponse.json({error:'Invalid provider mode'},{status:400})
 const existing=await getWorkspaceItem(workspace.id,'provider','settings')
 const current=(existing?.settings as ProviderSettings|undefined)||{mode:'auto'}
 const settings:ProviderSettings={...current,mode:body.mode||current.mode,openaiModel:body.openaiModel?.trim()||current.openaiModel,openrouterModel:body.openrouterModel?.trim()||current.openrouterModel}
 if(body.openaiKey?.trim())settings.openai=encryptProviderKey(body.openaiKey.trim())
 if(body.openrouterKey?.trim())settings.openrouter=encryptProviderKey(body.openrouterKey.trim())
 if(body.removeOpenai)delete settings.openai
 if(body.removeOpenrouter)delete settings.openrouter
 await putWorkspaceItem(workspace.id,'provider','settings',{settings,updatedBy:workspace.userId})
 return NextResponse.json(await getProviderStatus(workspace.id))
}
