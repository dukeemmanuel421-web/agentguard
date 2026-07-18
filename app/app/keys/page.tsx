import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionWorkspace } from '@/lib/tenant'
import { AgentGuardLogo } from '@/components/agentguard-logo'
import { KeyManager } from '@/components/key-manager'
import { Button } from '@/components/ui/button'
export default async function Keys(){if(!(await getSessionWorkspace()))redirect('/login');return <main className="min-h-screen"><header className="border-b"><div className="mx-auto flex h-16 max-w-7xl items-center px-5 lg:px-8"><AgentGuardLogo/></div></header><div className="mx-auto max-w-5xl px-5 py-10 lg:px-8 lg:py-16"><Button render={<Link href="/app"/>} nativeButton={false} variant="ghost" className="mb-10 -ml-2"><ArrowLeft/>Overview</Button><div className="mb-10 border-b pb-8"><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Developer settings</p><h1 className="mt-4 text-5xl font-medium tracking-[-.05em]">API keys</h1><p className="mt-4 max-w-xl text-pretty leading-relaxed text-muted-foreground">Create and revoke credentials for production traffic. Keys are hashed at rest and only shown once.</p></div><KeyManager/></div></main>}
