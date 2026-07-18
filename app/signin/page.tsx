import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { signIn } from '@/auth'
import { AgentGuardLogo, AgentGuardMark } from '@/components/agentguard-logo'
import { Button } from '@/components/ui/button'
import { Field,FieldGroup,FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const authConfigReady = () => Boolean(
  (process.env.AUTH_SECRET || process.env.NODE_ENV !== 'production') &&
  (process.env.AUTH_GMAIL_ID || process.env.GMAIL_USER) &&
  (process.env.AUTH_GMAIL_SECRET || process.env.GMAIL_APP_PASSWORD) &&
  process.env.DYNAMODB_AUTH_TABLE,
)

async function requestMagicLink(form: FormData) {
  'use server'
  const email = String(form.get('email') || '').trim()
  if (!email || !authConfigReady()) redirect('/signin?error=configuration')

  let errorCode = ''
  try {
    await signIn('nodemailer', { email, redirectTo: '/app' })
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error
    errorCode = 'signin'
  }
  if (errorCode) redirect(`/signin?error=${errorCode}`)
}

const messages: Record<string, string> = {
  configuration: 'Sign in is not fully configured yet. Set AUTH_SECRET, Gmail credentials, and the DynamoDB auth table before sending magic links.',
  signin: 'We could not send a magic link. Check the email provider and auth table configuration, then try again.',
}

export default async function SignIn({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const params = await searchParams
  const error = params?.error ? messages[params.error] : ''

  return <main className="grid min-h-screen lg:grid-cols-2"><section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex"><AgentGuardMark className="size-12"/><div><p className="max-w-xl text-5xl font-medium leading-[1.02] tracking-[-.05em]">Control what enters your agent&apos;s context.</p><div className="mt-10 flex flex-col gap-4 border-t border-primary-foreground/20 pt-6 text-sm text-primary-foreground/60"><p className="flex items-center gap-3"><Check className="size-4"/>Three mandatory detector signals</p><p className="flex items-center gap-3"><Check className="size-4"/>Fail-closed security semantics</p><p className="flex items-center gap-3"><Check className="size-4"/>Auditable scan history</p></div></div><p className="text-xs text-primary-foreground/40">AgentGuard security console</p></section><section className="flex flex-col p-5 md:p-10"><Link href="/" aria-label="AgentGuard home"><AgentGuardLogo/></Link><div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-16"><p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Secure access</p><h1 className="mt-5 text-4xl font-medium tracking-[-.04em]">Sign in to your console</h1><p className="mt-3 text-pretty leading-relaxed text-muted-foreground">We&apos;ll send a one-time, secure link to your work email. No password required.</p>{error?<div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm leading-relaxed text-destructive" role="alert">{error}</div>:null}<form className="mt-10" action={requestMagicLink}><FieldGroup><Field><FieldLabel htmlFor="email">Work email</FieldLabel><Input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email" className="h-12"/></Field><Button type="submit" size="lg" className="h-12 rounded-full">Continue with email<ArrowRight/></Button></FieldGroup></form><p className="mt-6 text-xs leading-relaxed text-muted-foreground">By continuing, you agree to use AgentGuard for authorized security evaluation only.</p></div></section></main>
}
