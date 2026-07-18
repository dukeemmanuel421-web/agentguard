export const trustLevels = ['USER_PROMPT','TRUSTED_TOOL','TOOL_OUTPUT','WEB_PAGE','DOCUMENT','MCP_OUTPUT','UNKNOWN'] as const
export type TrustLevel = (typeof trustLevels)[number]
export type Severity = 'low'|'medium'|'high'|'critical'
export type Finding = { detector:string; severity:Severity; snippet:string; reason:string }
export type DetectorResult = { risk:number; findings:Omit<Finding,'detector'>[]; rationale?:string; model?:string; latency_ms?:number }
export type ScanResult = { blocked:boolean; risk:number; sanitized_text:string; detectors:{heuristic:DetectorResult;llm:DetectorResult;probe:DetectorResult};findings:Finding[];policy?:{id:string;name:string;version:number;threshold:number;reason:string};provenance?:{provider:'openai'|'openrouter'|'aws';model:string;source:'workspace'|'environment'|'aws';fallback:boolean;signal:'semantic'|'inferred-probe'}[];degraded?:boolean }
export const BLOCK_THRESHOLD = 0.62
export const DETECTOR_WEIGHTS = { heuristic:0.35,llm:0.4,probe:0.25 } as const
