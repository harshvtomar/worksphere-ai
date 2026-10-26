import test from 'node:test';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { startStack } from './fixtures/stack.mjs';

class Browser {
  jars=new Map();csrf='';cookies=[];
  async request(url,options={}){
    const host=new URL(url).origin;const jar=this.jars.get(host)??new Map();
    const res=await fetch(url,{redirect:'manual',...options,headers:{...(jar.size?{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{}),...options.headers}});
    this.cookies=res.headers.getSetCookie();
    for(const value of this.cookies){const pair=value.split(';')[0];const at=pair.indexOf('=');jar.set(pair.slice(0,at),pair.slice(at+1));}
    this.jars.set(host,jar);return res;
  }
  async call(path,method='GET',body,extra={}){
    const res=await this.request(`${origin}/v1${path}`,{method,headers:{'content-type':'application/json',...(method!=='GET'?{origin,'x-csrf-token':this.csrf}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await res.json();return{status:res.status,data,res};
  }
  async session(){const r=await this.call('/auth/session');this.csrf=r.data.csrfToken;return r;}
  async login(account, { wrongNonce = false } = {}){
    await this.session();const before=this.jars.get(origin).get('ws.sid');
    const start=await this.call('/auth/login','POST',{});assert.equal(start.status,201,JSON.stringify(start.data));
    const auth=new URL(start.data.url);assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.ok(auth.searchParams.get('state'));assert.ok(auth.searchParams.get('nonce'));
    if(wrongNonce)auth.searchParams.set('nonce','wrong-nonce');
    let url=auth.href;
    for(let i=0;i<12;i++){
      let res;
      if(new URL(url).pathname.startsWith('/interaction/'))res=await this.request(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:`account=${account}`});
      else res=await this.request(url);
      if(res.status>=300&&res.status<400){url=new URL(res.headers.get('location'),url).href;if(url===`${origin}/dashboard`||url.includes('/login?error='))break;}else throw new Error(`OIDC unexpected ${res.status}: ${await res.text()}`);
    }
    const s=await this.session();
    if(wrongNonce||['unverified','duplicate'].includes(account)){assert.equal(s.data.user,null);return;}
    assert.ok(s.data.user,`login failed: ${url}`);assert.notEqual(this.jars.get(origin).get('ws.sid'),before);return s.data.user;
  }
}
let stack,origin,owner,admin,member,outsider,org,other;
const token=r=>r.data.invitationUrl.split('#token=')[1];
await test('Stage 2 real HTTP / OIDC / database integration', {timeout:180000},async t=>{
  stack=await startStack();origin=stack.origin;
  try{
    await t.test('unauthenticated API and frontend routes are protected',async()=>{const b=new Browser();assert.equal((await b.call('/organizations')).status,401);for(const path of ['/dashboard','/organizations']){const r=await b.request(origin+path);assert.equal(r.status,307);assert.equal(r.headers.get('location'),'/login');}});
    await t.test('anonymous session cookie is HttpOnly / SameSite and CSRF is enforced',async()=>{const b=new Browser();await b.session();assert.match(b.cookies.join(';'),/HttpOnly/i);assert.match(b.cookies.join(';'),/SameSite=Lax/i);assert.equal((await b.call('/auth/login','POST',{}, {'x-csrf-token':''})).status,403);assert.equal((await b.call('/auth/login','POST',{}, {origin:'https://evil.invalid'})).status,403);assert.equal((await b.call('/auth/login','POST',{}, {'x-csrf-token':'é'.repeat(64)})).status,403);});
    await t.test('real OIDC code flow with PKCE creates users and rotates session IDs',async()=>{owner=new Browser();admin=new Browser();member=new Browser();outsider=new Browser();await owner.login('owner');await admin.login('admin');await member.login('member');await outsider.login('outsider');});
    await t.test('parallel protected page loads retain the authenticated session',async()=>{const results=await Promise.all(Array.from({length:8},()=>owner.request(origin+'/organizations')));for(const r of results){assert.equal(r.status,200);const html=await r.text();assert.doesNotMatch(html,/NEXT_REDIRECT.*login/);}});
    await t.test('unverified email and same-email different subject cannot authenticate',async()=>{await new Browser().login('unverified');await new Browser().login('duplicate');});
    await t.test('forged callback state fails closed',async()=>{const b=new Browser();await b.session();await b.call('/auth/login','POST',{});const r=await b.request(`${origin}/v1/auth/callback?code=fake&state=wrong&iss=http%3A%2F%2F127.0.0.1%3A44683`);assert.match(r.headers.get('location'),/error=signin/);assert.equal((await b.session()).data.user,null);});
    await t.test('OIDC nonce mismatch is rejected',async()=>{await new Browser().login('owner',{wrongNonce:true});});
    await t.test('organization creation persists owner membership and validates fields',async()=>{const r=await owner.call('/organizations','POST',{name:'Studio North',slug:'studio-north'});assert.equal(r.status,201);org=r.data.id;const roles=await owner.call('/organizations');assert.equal(roles.data[0].role,'OWNER');assert.equal((await owner.call('/organizations','POST',{name:'Duplicate',slug:'studio-north'})).status,409);assert.equal((await owner.call('/organizations','POST',{name:'Injected',slug:'valid-slug',role:'OWNER'})).status,400);});
    await t.test('concurrent organization panels retain authorization and respond successfully',async()=>{const results=await Promise.all(Array.from({length:4},()=>Promise.all([owner.call(`/organizations/${org}/members`),owner.call(`/organizations/${org}/invitations`),owner.session()])));for(const group of results)for(const r of group)assert.equal(r.status,200,JSON.stringify(r.data));});
    await t.test('cross-tenant IDs never expose details, members, invitations or select state',async()=>{other=(await outsider.call('/organizations','POST',{name:'Other Team',slug:'other-team'})).data.id;for(const suffix of ['', '/members','/invitations'])assert.equal((await outsider.call(`/organizations/${org}${suffix}`)).status,404);assert.equal((await outsider.call(`/organizations/${org}/select`,'POST')).status,404);});
    await t.test('owner invitation matches verified email and stores only token hash',async()=>{const r=await owner.call(`/organizations/${org}/invitations`,'POST',{email:'ADMIN@example.test',role:'ADMIN'});assert.equal(r.status,201);assert.equal((await outsider.call('/invitations/accept','POST',{token:token(r)})).status,403);const db=await stack.pool.query('SELECT "tokenHash" FROM "Invitation" WHERE id=$1',[r.data.id]);assert.notEqual(db.rows[0].tokenHash,token(r));assert.equal((await admin.call('/invitations/accept','POST',{token:token(r)})).status,201);assert.equal((await admin.call('/invitations/accept','POST',{token:token(r)})).status,409);});
    await t.test('admin may invite MEMBER but cannot invite ADMIN or OWNER',async()=>{assert.equal((await admin.call(`/organizations/${org}/invitations`,'POST',{email:'member@example.test',role:'ADMIN'})).status,403);assert.equal((await owner.call(`/organizations/${org}/invitations`,'POST',{email:'member@example.test',role:'OWNER'})).status,400);const r=await admin.call(`/organizations/${org}/invitations`,'POST',{email:'member@example.test',role:'MEMBER'});assert.equal(r.status,201);assert.equal((await member.call('/invitations/accept','POST',{token:token(r)})).status,201);});
    await t.test('members can list team but cannot invite, change roles or remove owner',async()=>{const r=await member.call(`/organizations/${org}/members`);assert.equal(r.status,200);const ownerId=r.data.find(x=>x.role==='OWNER').id;const memberId=r.data.find(x=>x.role==='MEMBER').id;assert.equal((await member.call(`/organizations/${org}/invitations`,'POST',{email:'new@example.test',role:'MEMBER'})).status,403);assert.equal((await member.call(`/organizations/${org}/members/${memberId}`,'PATCH',{role:'ADMIN'})).status,403);assert.equal((await admin.call(`/organizations/${org}/members/${memberId}`,'PATCH',{role:'ADMIN'})).status,403);assert.equal((await owner.call(`/organizations/${org}/members/${ownerId}`,'DELETE')).status,403);});
    await t.test('owner can change roles; cross-tenant membership mutation rejected',async()=>{const r=await owner.call(`/organizations/${org}/members`);const id=r.data.find(x=>x.role==='MEMBER').id;assert.equal((await outsider.call(`/organizations/${other}/members/${id}`,'DELETE')).status,404);assert.equal((await owner.call(`/organizations/${org}/members/${id}`,'PATCH',{role:'ADMIN'})).status,200);assert.equal((await owner.call(`/organizations/${org}/members/${id}`,'PATCH',{role:'MEMBER'})).status,200);});
    await t.test('expired, revoked and reissued invitations fail acceptance',async()=>{const a=await owner.call(`/organizations/${org}/invitations`,'POST',{email:'outsider@example.test',role:'MEMBER'});await stack.pool.query('UPDATE "Invitation" SET "expiresAt"=\'2000-01-01 00:00:00\' WHERE id=$1',[a.data.id]);assert.equal((await outsider.call('/invitations/accept','POST',{token:token(a)})).status,409);const b=await owner.call(`/organizations/${org}/invitations`,'POST',{email:'outsider@example.test',role:'MEMBER'});const c=await owner.call(`/organizations/${org}/invitations`,'POST',{email:'outsider@example.test',role:'MEMBER'});assert.equal((await outsider.call('/invitations/accept','POST',{token:token(b)})).status,409);assert.equal((await owner.call(`/organizations/${org}/invitations/${c.data.id}`,'DELETE')).status,200);assert.equal((await outsider.call('/invitations/accept','POST',{token:token(c)})).status,409);});
    await t.test('revoking inviter membership invalidates outstanding invitation and access immediately',async()=>{const invitation=await admin.call(`/organizations/${org}/invitations`,'POST',{email:'outsider@example.test',role:'MEMBER'});const members=await owner.call(`/organizations/${org}/members`);const id=members.data.find(x=>x.user.email==='admin@example.test').id;assert.equal((await owner.call(`/organizations/${org}/members/${id}`,'DELETE')).status,200);assert.equal((await admin.call(`/organizations/${org}/members`)).status,404);assert.equal((await outsider.call('/invitations/accept','POST',{token:token(invitation)})).status,409);});
    await t.test('concurrent acceptance consumes an invitation exactly once',async()=>{const r=await owner.call(`/organizations/${org}/invitations`,'POST',{email:'outsider@example.test',role:'MEMBER'});assert.equal(r.status,201);const results=await Promise.all([outsider.call('/invitations/accept','POST',{token:token(r)}),outsider.call('/invitations/accept','POST',{token:token(r)})]);assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);});
    await t.test('active organization is persisted server-side but cannot grant access',async()=>{assert.equal((await owner.call(`/organizations/${org}/select`,'POST')).status,201);assert.equal((await owner.session()).data.activeOrganizationId,org);assert.equal((await owner.call(`/organizations/${other}`)).status,404);});
    await t.test('absolute session expiration invalidates authenticated requests',async()=>{const user=(await member.session()).data.user;await stack.pool.query('UPDATE session SET sess=jsonb_set(sess::jsonb,\'{authenticatedAt}\',to_jsonb($1::bigint))::json WHERE sess->>\'userId\'=$2',[Date.now()-9*3600000,user.id]);assert.equal((await member.call('/organizations')).status,401);assert.equal((await member.session()).data.user,null);});
    await t.test('idle session expiry and cookie tampering are rejected',async()=>{const user=(await outsider.session()).data.user;await stack.pool.query('UPDATE session SET expire=\'2000-01-01\' WHERE sess->>\'userId\'=$1',[user.id]);assert.equal((await outsider.call('/organizations')).status,401);const b=new Browser();b.jars.set(origin,new Map([['ws.sid','s%3Aforged.signature']]));assert.equal((await b.call('/organizations')).status,401);});
    await t.test('logout invalidates captured cookie and protected frontend access',async()=>{const cookie=new Map(owner.jars.get(origin));assert.equal((await owner.call('/auth/logout','POST')).status,201);owner.jars.set(origin,cookie);assert.equal((await owner.call('/organizations')).status,401);const r=await owner.request(origin+'/dashboard');assert.equal(r.status,307);});
  }catch(error){console.error(stack.logs());throw error;}finally{if(process.env.STAGE2_DEBUG_LOG)writeFileSync(process.env.STAGE2_DEBUG_LOG,stack.logs());await stack.stop();}
});
