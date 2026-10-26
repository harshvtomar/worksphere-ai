/** Isolated test identity provider. NEVER deployed or imported by application code. */
import { Provider } from 'oidc-provider';
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK } from 'jose';
export const accounts = {
  owner: { email:'owner@example.test', name:'Alex Owner', verified:true },
  admin: { email:'admin@example.test', name:'Sam Admin', verified:true },
  member: { email:'member@example.test', name:'Jordan Member', verified:true },
  outsider: { email:'outsider@example.test', name:'Taylor Outside', verified:true },
  unverified: { email:'unverified@example.test', name:'Unverified', verified:false },
  duplicate: { email:'owner@example.test', name:'Different subject', verified:true },
};
export async function startProvider({issuer,redirectUri,port,browserOrigin}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Test provider is prohibited in production');
  const {privateKey}=await generateKeyPair('RS256',{extractable:true});
  const jwk=await exportJWK(privateKey);jwk.kid='disposable-test-key';jwk.alg='RS256';jwk.use='sig';
  const provider=new Provider(issuer,{
    clients:[{client_id:'worksphere-test',client_secret:'disposable-oidc-test-secret',redirect_uris:[redirectUri],response_types:['code'],grant_types:['authorization_code'],token_endpoint_auth_method:'client_secret_post'}],
    jwks:{keys:[jwk]},cookies:{keys:['disposable-provider-cookie-key-123456789']},
    features:{devInteractions:{enabled:false}},
    conformIdTokenClaims:false,
    claims:{openid:['sub'],email:['email','email_verified'],profile:['name']},
    pkce:{required:()=>true},
    interactions:{url:(_ctx,interaction)=>`/interaction/${interaction.uid}`},
    findAccount:async(_ctx,id)=>accounts[id]?{accountId:id,claims:async()=>({sub:id,email:accounts[id].email,email_verified:accounts[id].verified,name:accounts[id].name})}:undefined,
  });
  if(browserOrigin) provider.use(async(ctx,next)=>{await next();if(ctx.path==='/.well-known/openid-configuration')ctx.body.authorization_endpoint=browserOrigin+'/auth';});
  const handler=provider.callback();
  const server=createServer(async(req,res)=>{
    try {
      if(req.url.startsWith('/interaction/')) {
        const details=await provider.interactionDetails(req,res);
        if(req.method==='GET') {
          res.setHeader('Content-Type','text/html');res.end(`<h1>WorkSphere test identity provider</h1><p>Isolated QA accounts only. No real passwords.</p><form method="post">${Object.keys(accounts).map(a=>`<button name="account" value="${a}">Sign in as ${a}</button>`).join(' ')}</form>`);return;
        }
        let body='';for await(const chunk of req)body+=chunk;
        const account=new URLSearchParams(body).get('account');
        if(!accounts[account]){res.writeHead(400);res.end();return;}
        const grant=new provider.Grant({accountId:account,clientId:details.params.client_id});
        grant.addOIDCScope('openid email profile');
        const grantId=await grant.save();
        await provider.interactionFinished(req,res,{login:{accountId:account},consent:{grantId}},{mergeWithLastSubmission:false});return;
      }
      handler(req,res);
    } catch {res.writeHead(500);res.end('Test provider interaction failed');}
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {server,provider};
}
