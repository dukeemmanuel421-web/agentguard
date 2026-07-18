import { mkdir,writeFile } from 'node:fs/promises'

const endpoint=process.env.CHROME_DEBUG_URL||'http://127.0.0.1:9223'
const baseUrl=process.env.DEMO_URL||'https://agentguard-jade.vercel.app'
const output=process.env.DEMO_OUTPUT||'/opt/cursor/artifacts'
await mkdir(output,{recursive:true})

const targets=await fetch(`${endpoint}/json`).then(response=>response.json())
const target=targets.find(item=>item.type==='page')
if(!target)throw new Error('No Chrome page target is available')

const socket=new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{
  socket.addEventListener('open',resolve,{once:true})
  socket.addEventListener('error',reject,{once:true})
})

let nextId=1
const pending=new Map()
socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data)
  if(!message.id)return
  const request=pending.get(message.id)
  if(!request)return
  pending.delete(message.id)
  if(message.error)request.reject(new Error(message.error.message))
  else request.resolve(message.result)
})

function command(method,params={}){
  const id=nextId++
  socket.send(JSON.stringify({id,method,params}))
  return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}))
}

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function evaluate(expression){
  const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})
  return result.result?.value
}
async function waitFor(expression,timeout=30000){
  const started=Date.now()
  while(Date.now()-started<timeout){
    if(await evaluate(expression))return
    await sleep(500)
  }
  throw new Error(`Timed out waiting for: ${expression}`)
}
async function screenshot(name){
  const result=await command('Page.captureScreenshot',{format:'png',fromSurface:true})
  await writeFile(`${output}/${name}`,Buffer.from(result.data,'base64'))
}

await command('Page.enable')
await command('Runtime.enable')
await command('Page.navigate',{url:baseUrl})
await waitFor(`document.readyState === 'complete'`)
await sleep(1500)
await evaluate(`document.querySelector('#scanner').scrollIntoView({block:'start'})`)
await sleep(700)
await screenshot('agentguard-live-01-ready.png')

await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Run scan')).click()`)
await waitFor(`[...document.querySelectorAll('h3')].some(node=>node.textContent.trim()==='Blocked')`,45000)
await screenshot('agentguard-live-02-blocked.png')

await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Benign support').click()`)
await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Run scan')).click()`)
await waitFor(`[...document.querySelectorAll('h3')].some(node=>node.textContent.trim()==='Allowed')`,45000)
await screenshot('agentguard-live-03-allowed.png')

socket.close()
