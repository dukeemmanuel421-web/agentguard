import { Shield } from 'lucide-react'
import { signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '@/components/ui/card'
import { Field,FieldGroup,FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
export default function SignIn(){return <main className="flex min-h-screen items-center justify-center bg-muted p-4"><Card className="w-full max-w-md"><CardHeader><span className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Shield className="size-5"/></span><CardTitle>Sign in to AgentGuard</CardTitle><CardDescription>We&apos;ll send a secure magic link through Gmail.</CardDescription></CardHeader><CardContent><form action={async(form)=>{'use server';await signIn('nodemailer',{email:String(form.get('email')),redirectTo:'/app'})}}><FieldGroup><Field><FieldLabel htmlFor="email">Work email</FieldLabel><Input id="email" name="email" type="email" placeholder="you@company.com" required autoComplete="email"/></Field><Button type="submit">Send magic link</Button></FieldGroup></form></CardContent></Card></main>}
