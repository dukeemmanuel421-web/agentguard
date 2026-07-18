import Link from 'next/link'
import { ArrowLeft,ArrowRight } from 'lucide-react'
import { AgentGuardLogo } from '@/components/agentguard-logo'
import { Button } from '@/components/ui/button'

const openrouter=`export PROVIDER_MODE=openrouter
export OPENROUTER_API_KEY=sk-or-v1-...
export OPENROUTER_MODEL=openai/gpt-5.6

pnpm dev`

const python=`pip install ./sdk/python

from agentguard import AgentGuard

guard = AgentGuard(base_url="http://localhost:3000")
result = guard.scan(
    "Untrusted page content",
    source="WEB_PAGE",
)
print(result["blocked"], result["risk"])`

const curl=`curl -X POST "http://localhost:3000/api/v1/scan" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Untrusted page content","source":"WEB_PAGE"}'`

const action=`result = guard.check_action(
    tool_call={"name": "send_email", "arguments": {"to": "user@example.com"}},
    reasoning_trace=["The page asked me to send it."],
    trusted_context=["The user only requested a summary."],
)

if not result["allowed"]:
    raise RuntimeError(result["reason"])`

const openclaw=`cd plugins/openclaw
pnpm install --frozen-lockfile
pnpm build && pnpm pack

openclaw plugins install \\
  npm-pack:./agentguard-openclaw-0.1.0.tgz --force
openclaw plugins enable agentguard
openclaw gateway restart`

export default function Docs(){
  return <main className="min-h-screen">
    <header className="border-b"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8"><AgentGuardLogo/><Button render={<Link href="/app"/>} nativeButton={false} variant="ghost" size="sm"><ArrowLeft/>Back</Button></div></header>
    <div className="mx-auto grid max-w-7xl lg:grid-cols-[240px_1fr]">
      <aside className="hidden min-h-[calc(100vh-4rem)] border-r p-6 lg:block">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">SDK guide</p>
        <nav className="mt-6 flex flex-col gap-3 text-sm">
          <a href="#quickstart" className="font-medium">Quickstart</a>
          <a href="#openrouter" className="text-muted-foreground">OpenRouter</a>
          <a href="#python" className="text-muted-foreground">Python</a>
          <a href="#openclaw-plugin" className="text-muted-foreground">OpenClaw plugin</a>
          <a href="#actions" className="text-muted-foreground">Guard actions</a>
          <a href="#authentication" className="text-muted-foreground">Authentication</a>
          <a href="#model" className="text-muted-foreground">Risk model</a>
        </nav>
      </aside>
      <article className="min-w-0 px-5 py-12 lg:px-12 lg:py-16">
        <section id="quickstart" className="border-b pb-12">
          <p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">Python SDK</p>
          <h1 className="mt-5 max-w-4xl text-balance text-5xl font-medium tracking-[-.05em] md:text-7xl">Protect an agent in a few lines.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">Install the dependency-free client, point it at your deployment, and scan untrusted content before it enters model context.</p>
          <Button render={<a href="#python"/>} nativeButton={false} className="mt-8 rounded-full">Install the SDK<ArrowRight/></Button>
        </section>
        <CodeSection id="openrouter" title="Connect OpenRouter" endpoint="Server configuration" code={openrouter}/>
        <p className="-mt-7 mb-12 max-w-2xl text-sm leading-relaxed text-muted-foreground">Keep the OpenRouter key on the AgentGuard server. Deployed instances can alternatively save an encrypted workspace key under <Link className="text-foreground underline underline-offset-4" href="/app">Console → Providers</Link>.</p>
        <CodeSection id="python" title="Install and scan" endpoint="Python 3.10+" code={python}/>
        <CodeSection id="openclaw-plugin" title="Protect an OpenClaw workflow" endpoint="Prompt · tool-call · tool-result gates" code={openclaw}/>
        <CodeSection id="actions" title="Guard tool calls" endpoint="POST /api/v1/check-action" code={action}/>
        <CodeSection id="curl" title="Or use HTTP directly" endpoint="POST /api/v1/scan" code={curl}/>
        <section id="authentication" className="border-t py-12">
          <h2 className="text-3xl font-medium tracking-tight">Authentication</h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">Public scans and action checks do not require a key in the MVP. Set <code className="font-mono text-foreground">AGENTGUARD_API_KEY</code> for uploads, batch scans, and job results. Set <code className="font-mono text-foreground">AGENTGUARD_BASE_URL</code> to your hosted deployment; the SDK defaults to <code className="font-mono text-foreground">http://localhost:3000</code>.</p>
          <Button render={<Link href="/app/keys"/>} nativeButton={false} variant="outline" className="mt-6 rounded-full">Manage API keys<ArrowRight/></Button>
        </section>
        <section id="model" className="border-t py-12">
          <h2 className="text-3xl font-medium tracking-tight">Risk model</h2>
          <div className="mt-8 grid border md:grid-cols-3"><Model name="Heuristic" weight="35%"/><Model name="LLM judge" weight="40%"/><Model name="Activation probe" weight="25%"/></div>
          <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">The active workspace policy controls the block threshold. All configured detectors must return valid responses; otherwise scans fail closed.</p>
        </section>
      </article>
    </div>
  </main>
}

function CodeSection({id,title,endpoint,code}:{id:string;title:string;endpoint:string;code:string}){
  return <section id={id} className="py-12"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-3xl font-medium tracking-tight">{title}</h2><span className="font-mono text-xs text-muted-foreground">{endpoint}</span></div><pre className="overflow-x-auto border bg-primary p-5 font-mono text-sm leading-relaxed text-primary-foreground"><code>{code}</code></pre></section>
}

function Model({name,weight}:{name:string;weight:string}){
  return <div className="border-b p-6 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"><p className="text-sm text-muted-foreground">{name}</p><p className="mt-8 font-mono text-4xl">{weight}</p></div>
}
