/** Disposable browser QA only. No real accounts; never use as a deployment entry point. */
import http from 'node:http';
import { startStack } from '../tests/fixtures/stack.mjs';
if(process.env.NODE_ENV==='production')throw new Error('QA fixture prohibited in production');
const publicOrigin=process.env.QA_PUBLIC_ORIGIN??'http://localhost:4173';
const stack=await startStack({publicOrigin});
const server=http.createServer((req,res)=>{
  const provider=req.url.startsWith('/auth')||req.url.startsWith('/interaction/');
  const upstream=http.request({hostname:'127.0.0.1',port:provider?44683:3000,path:req.url,method:req.method,headers:req.headers},response=>{
    const headers={...response.headers};
    if(provider&&headers.location?.startsWith('http://127.0.0.1:44683'))headers.location=headers.location.replace('http://127.0.0.1:44683',publicOrigin);
    res.writeHead(response.statusCode,headers);response.pipe(res);
  });
  upstream.on('error',()=>{res.writeHead(502);res.end('QA service unavailable');});req.pipe(upstream);
});
server.listen(Number(process.env.PORT??4173),'0.0.0.0',()=>console.log('Disposable Stage 2 browser QA ready'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{server.close();await stack.stop();process.exit();});
