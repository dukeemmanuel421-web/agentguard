import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

function privateIp(ip:string){
 return ip==='::1'||ip.startsWith('fc')||ip.startsWith('fd')||ip.startsWith('fe80:')||
  /^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(ip)||
  /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
}

export async function assertSafeWebhookUrl(value:string){
 const url=new URL(value)
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('Webhook must use standard HTTPS')
 const host=url.hostname.toLowerCase()
 if(host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||isIP(host))throw new Error('Private webhook destinations are not allowed')
 const addresses=await lookup(host,{all:true,verbatim:true})
 if(!addresses.length||addresses.some(item=>privateIp(item.address)))throw new Error('Webhook resolves to a private network')
 return url
}
