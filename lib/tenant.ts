import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWorkspace } from '@/lib/workspace'

export async function getSessionWorkspace(){
 const session=await getSession()
 if(!session?.user?.id)return null
 return getWorkspace(session.user)
}

export const unauthorized=()=>NextResponse.json({error:'Authentication required'},{status:401})

export function assertSameOrigin(request:Request){
 if(['GET','HEAD','OPTIONS'].includes(request.method))return true
 const origin=request.headers.get('origin')
 if(!origin)return false
 const expected=new URL(process.env.NEXTAUTH_URL||process.env.AUTH_URL||request.url).origin
 return origin===expected
}
