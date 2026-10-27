import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { startProvider } from './oidc.mjs';
import pg from 'pg';
export async function startStack({ publicOrigin, embeddedPreview = false } = {}) {
  const root=new URL('../../',import.meta.url);
  const origin=publicOrigin??'http://127.0.0.1:3000';
  const issuer='http://127.0.0.1:44683';
  let embedded,socket;
  let url=process.env.STAGE2_TEST_DATABASE_URL;
  if(!url && !embeddedPreview) throw new Error("STAGE2_TEST_DATABASE_URL must point to a disposable PostgreSQL database with both migrations applied. PGlite socket multiplexing cannot validate concurrent sessions reliably.");
  if(!url){
    embedded=await PGlite.create();await embedded.exec("SET TIME ZONE 'UTC'");
    for(const dir of (await readdir(new URL('packages/database/prisma/migrations/',root))).filter(x=>/^\d/.test(x)).sort()) await embedded.exec(await readFile(new URL(`packages/database/prisma/migrations/${dir}/migration.sql`,root),'utf8'));
    socket=new PGLiteSocketServer({db:embedded,host:'127.0.0.1',port:44684,maxConnections:20});await socket.start();url='postgresql://postgres:postgres@127.0.0.1:44684/postgres';
  }
  const pool=new pg.Pool({connectionString:url,max:1});
  const oidc=await startProvider({issuer,redirectUri:`${origin}/v1/auth/callback`,port:44683,browserOrigin:publicOrigin});
  const children=[];let logs='';
  const env={...process.env,NODE_ENV:'test',DATABASE_URL:url,WEB_ORIGIN:origin,SESSION_SECRET:'disposable-session-test-secret-1234567890',OIDC_ISSUER:issuer,OIDC_CLIENT_ID:'worksphere-test',OIDC_CLIENT_SECRET:'disposable-oidc-test-secret',CORS_ORIGINS:origin,PORT:'4000'};
  for(const args of [['apps/api/dist/main.js'],['node_modules/next/dist/bin/next','start','apps/web','--hostname','127.0.0.1','--port','3000']]){
    const child=spawn(process.execPath,args,{cwd:root,env,stdio:['ignore','pipe','pipe']});children.push(child);
    child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
  }
  const stop=async()=>{for(const p of children)p.kill('SIGTERM');await sleep(300);await pool.end();await new Promise(r=>oidc.server.close(r));if(socket)await socket.stop();if(embedded)await embedded.close();};
  try {
    for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4000/v1/health')).ok)return{origin,pool,stop,logs:()=>logs};}catch{}if(children.some(p=>p.exitCode!==null))throw new Error(logs);await sleep(200);}
    throw new Error('Stack startup timed out: '+logs);
  }catch(e){await stop();throw e;}
}
