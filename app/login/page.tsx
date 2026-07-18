'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { AgentGuardLogo } from '@/components/agentguard-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Login(){
 const [email,setEmail]=useState('');const [sent,setSent]=useState(false)
 return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5"><AgentGuardLogo/><h1 className="mt-10 text-4xl font-medium">Access your workspace</h1><p className="mt-3 text-muted-foreground">We&apos;ll email a secure sign-in link. No password is stored.</p>{sent?<p className="mt-8 border p-5">Check your inbox for the AgentGuard sign-in link.</p>:<form className="mt-8 flex flex-col gap-3" onSubmit={async e=>{e.preventDefault();await signIn('email',{email,callbackUrl:'/app',redirect:false});setSent(true)}}><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><Button type="submit">Email sign-in link</Button></form>}</main>
}
