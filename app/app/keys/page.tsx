import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@/auth'
import { KeyManager } from '@/components/key-manager'
import { Button } from '@/components/ui/button'
export default async function Keys(){if(!await auth())redirect('/signin');return <main className="min-h-screen bg-muted"><div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 md:px-6"><Button render={<Link href="/app"/>} variant="ghost" className="w-fit"><ArrowLeft/>Dashboard</Button><div><h1 className="text-3xl font-semibold">API keys</h1><p className="mt-1 text-muted-foreground">Create and revoke credentials for production traffic.</p></div><KeyManager/></div></main>}
