import type { DetectorResult, Severity } from '@/lib/contracts'

const rules: Array<{pattern:RegExp;risk:number;severity:Severity;reason:string}> = [
  {pattern:/ignore (?:all )?(?:prior|previous) instructions?/i,risk:.98,severity:'critical',reason:'Attempts to override prior trusted instructions.'},
  {pattern:/disregard (?:the )?(?:system|developer) prompt/i,risk:.98,severity:'critical',reason:'Explicit system-prompt override instruction.'},
  {pattern:/you are now (?:in|a|the)|act as (?:the )?(?:system|developer)/i,risk:.82,severity:'high',reason:'Attempts to replace the agent role.'},
  {pattern:/(?:forward|exfiltrate|send|upload).{0,48}(?:secret|token|credential|key|conversation)/i,risk:.95,severity:'critical',reason:'Requests transfer of sensitive context.'},
  {pattern:/(?:call|invoke|execute|run).{0,32}(?:tool|function|shell|terminal|mcp)/i,risk:.8,severity:'high',reason:'Untrusted content contains a tool-execution imperative.'},
  {pattern:/if (?:an|the) ai (?:is )?reading this|attention (?:ai|assistant|agent)/i,risk:.9,severity:'critical',reason:'Content directly addresses and instructs an AI reader.'},
  {pattern:/[\u200B-\u200F\u2060\uFEFF]/u,risk:.72,severity:'high',reason:'Hidden or zero-width Unicode detected.'},
  {pattern:/(?:[A-Za-z0-9+/]{40,}={0,2}|(?:[0-9a-f]{2}){24,})/i,risk:.65,severity:'medium',reason:'Large encoded instruction-like blob detected.'},
]

export function heuristicDetector(text:string):DetectorResult {
 const findings = rules.flatMap(rule => { const match=text.match(rule.pattern); return match ? [{severity:rule.severity,snippet:match[0].slice(0,180),reason:rule.reason,risk:rule.risk}] : [] })
 const risk = findings.length ? Math.min(.99, Math.max(...findings.map(f=>f.risk)) + Math.min(.12,(findings.length-1)*.04)) : .03
 return {risk,findings:findings.map(({risk:_,...f})=>f),latency_ms:0}
}

export function sanitizeText(text:string){
 return rules.reduce((value,rule)=>value.replace(rule.pattern,'[REDACTED: untrusted instruction]'),text)
}
