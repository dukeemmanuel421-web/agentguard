import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { AgentGuardLogo } from '@/components/agentguard-logo'
import { Button } from '@/components/ui/button'

export function SiteHeader(){
  return <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link href="/" aria-label="AgentGuard home"><AgentGuardLogo /></Link>
      <nav aria-label="Primary navigation" className="hidden items-center gap-7 text-sm md:flex">
        <a href="/#scanner" className="text-muted-foreground transition-colors hover:text-foreground">Scanner</a>
        <a href="/#approach" className="text-muted-foreground transition-colors hover:text-foreground">Approach</a>
        <Link href="/app/docs" className="text-muted-foreground transition-colors hover:text-foreground">Developers</Link>
      </nav>
      <Button render={<Link href="/signin"/>} nativeButton={false} size="lg" className="rounded-full px-4">Sign in<ArrowUpRight data-icon="inline-end"/></Button>
    </div>
  </header>
}
