import { cn } from '@/lib/utils'

export function AgentGuardMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn('size-8', className)} fill="none">
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="2" />
      <path d="M20 3a17 17 0 0 1 16.2 11.8L20 20V3Z" fill="currentColor" />
      <path d="M20 37A17 17 0 0 1 3.8 25.2L20 20v17Z" fill="currentColor" opacity=".45" />
      <circle cx="20" cy="20" r="5.25" fill="currentColor" />
      <circle cx="20" cy="20" r="2" fill="var(--background)" />
    </svg>
  )
}

export function AgentGuardLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-foreground', className)}>
      <AgentGuardMark />
      {!compact && <span className="text-base font-medium tracking-tight">AgentGuard</span>}
    </span>
  )
}
