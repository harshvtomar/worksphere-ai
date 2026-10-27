# Stage 1 live browser verification

Verified October 25, 2026 (Asia/Kolkata), using application checkpoint `d08d912685fa8546e8057a333f3a9e2ec9ad161d`. No application source changes were needed.

The earlier static-mirror-only limitation is closed. A separate QA copy contained the actual production Next.js build and NestJS compiled API. The managed preview launched one supervisor with both servers and a same-origin reverse proxy. No health response was mocked or rewritten. The existing configurable API URL was set to the empty string at build time so browser requests used `/v1/health` on the preview origin.

| Browser check | Observed result |
|---|---|
| Desktop | API connected; width/scrollWidth 1348/1348 |
| Mobile iframe, 390px | API connected; width/scrollWidth 375/375 |
| Tablet iframe, 768px | API connected; width/scrollWidth 753/753 |
| Health page | `{"status":"ok","service":"worksphere-api","version":"0.1.0"}` |
| Console | No application errors observed; one unrelated browser-extension metadata error |
| Visual inspection | Responsive cards and sidebar, readable sample-data labels, no document-level horizontal overflow |

This tests a same-origin reverse-proxy topology. Cross-origin allow/deny handling was separately verified by the existing HTTP smoke tests. Authentication and persistent tasks remain Stage 2 scope. The static-mirror offline observation remains historical evidence; this follow-up verifies real online behavior.

## Reproduce in a disposable checkout

Install dependencies, build the API, and build the frontend with the QA environment value:

```sh
npm ci
npm run build -w @worksphere/api
NEXT_PUBLIC_API_URL='' npm run build -w @worksphere/web
```

Create `qa-server.mjs` at that disposable checkout root with the following content. The proxy forwards requests and response bytes; it does not implement substitute application behavior. These QA-only files were not added to application code.

```js
import {spawn} from 'node:child_process';
import http from 'node:http';
const api=spawn(process.execPath,['apps/api/dist/main.js'],{env:{...process.env,PORT:'4000',CORS_ORIGINS:'http://terminal.local:4173'},stdio:'inherit'});
const web=spawn(process.execPath,['node_modules/next/dist/bin/next','start','apps/web','--hostname','127.0.0.1','--port','3000'],{stdio:'inherit'});
const server=http.createServer((req,res)=>{
 const proxy=http.request({hostname:'127.0.0.1',port:req.url.startsWith('/v1/')?4000:3000,path:req.url,method:req.method,headers:req.headers},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res)});
 proxy.on('error',()=>{res.writeHead(502);res.end('Service starting')});req.pipe(proxy);
});
server.listen(Number(process.env.PORT||4173),'0.0.0.0');
for (const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{api.kill();web.kill();server.close();process.exit()});
```

For the managed preview, set the disposable copy's `scripts.dev` to `node qa-server.mjs` and run `sites-preview start <absolute-checkout>`. Open its returned URL. For ordinary local QA, run `node qa-server.mjs` and open `http://localhost:4173`. Port 4000 is the actual API; port 3000 is the actual Next server. On termination the supervisor stops both children.

Create `apps/web/public/runtime-qa.html` before starting Next for the same responsive iframe checks:

```html
<!doctype html><html><head><title>WorkSphere responsive QA</title></head><body style="margin:0;background:#ddd;display:flex;gap:12px;align-items:flex-start"><iframe title="390 pixel mobile" src="/" style="width:390px;height:844px;border:0;flex:none"></iframe><iframe title="768 pixel tablet" src="/" style="width:768px;height:900px;border:0;flex:none"></iframe></body></html>
```

Open `/runtime-qa.html`, confirm both frames show `API connected`, inspect their layouts, and compare each root element's clientWidth and scrollWidth. Inspect browser console and `/v1/health`. Shut down the temporary preview afterward. No deployment, account registration, database modification or Stage 2 work is involved.


## Stage 2 browser checkpoint — October 27, 2026

Using built Next.js/NestJS and a disposable signed OIDC test provider, browser actions verified unauthenticated redirect, sign-in to protected dashboard, organization empty state, organization creation with Owner membership, invitation generation/history, reload persistence and wrong-email acceptance denial. These use synthetic accounts, not an external provider.

The concurrent 390px/768px iframe check exposed API request errors and loading states. PGlite's socket multiplexer subsequently reproduced missing portal/prepared-statement errors in HTTP tests. The API late-header crash was fixed and all concurrency tests passed against PostgreSQL 17 in hosted CI. Final responsive browser acceptance remains pending on a PostgreSQL-backed runtime; no final application-console pass is claimed. The public health indicator now defaults to same-origin `/v1`, and sample project/task labels distinguish real organizations from demo metrics.

Repeat on a disposable PostgreSQL database: apply both migrations, configure the real OIDC client per STAGE2_SECURITY.md, launch the application, and check login, organization selection/creation, invitation acceptance/replay, role controls, logout and protected redirects at desktop, 390px and 768px widths. Confirm no horizontal overflow or application console errors. Never use the synthetic provider as a production entry point.


## Superseding Stage 2 result — PostgreSQL 17 / Chromium

Run https://github.com/harshvtomar/worksphere-ai/actions/runs/40487980283 passed all three real-browser journeys at 1440×900, 768×1024 and 390×844. This resolves the earlier responsive acceptance limitation. Actual Next/Nest servers used standalone PostgreSQL 17; no mocked API responses or PGlite fallback. Expected 403/409 UI errors were asserted; unexpected console/page errors, API 5xx and document overflow failed the suite. A genuine database lock exercised the pending button state. Full-page screenshot review confirmed readable desktop/tablet/mobile organization and member controls.

Preserved screenshots: [desktop](evidence/stage2/desktop.png), [tablet](evidence/stage2/tablet.png), [mobile](evidence/stage2/mobile.png). The full 18-image report and sanitized network evidence are in the run's `stage2-browser-evidence` artifact. See STAGE2_BROWSER_ACCEPTANCE.md for reproduction. Identities remain synthetic; live external OIDC acceptance is separate and blocked.
