import { Controller, Get, Post, Req, Res, ServiceUnavailableException, UnauthorizedException, ConflictException } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as oidc from 'openid-client';
import { database } from './database.js';
import { cookieName, randomToken, webOrigin } from './security.js';

let provider: Promise<oidc.Configuration> | undefined;
function configuration() {
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET } = process.env;
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET) throw new ServiceUnavailableException('Configure the OIDC provider to enable sign-in');
  const issuer = new URL(OIDC_ISSUER);
  const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(issuer.hostname);
  if (issuer.protocol !== 'https:' && !local) throw new ServiceUnavailableException('OIDC issuer requires HTTPS');
  return provider ??= oidc.discovery(issuer, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, undefined,
    { execute: [...(local ? [oidc.allowInsecureRequests] : []), oidc.enableNonRepudiationChecks] }).catch(error => { provider = undefined; throw error; });
}
const save = (req: Request) => new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));

@Controller('auth')
export class AuthController {
  @Get('session')
  async current(@Req() req: Request) {
    req.session.csrf ??= randomToken();
    let user = null;
    if (req.session.userId) {
      user = await database().user.findUnique({ where: { id: req.session.userId }, select: { id: true, email: true, displayName: true } });
      if (!user) { delete req.session.userId; delete req.session.authenticatedAt; }
    }
    return { user, csrfToken: req.session.csrf, activeOrganizationId: req.session.organizationId ?? null };
  }

  @Post('login')
  async login(@Req() req: Request) {
    const config = await configuration();
    const verifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const requested = req.body?.returnTo;
    const returnTo = typeof requested === 'string' && (/^\/invite#token=[a-f0-9]{64}$/.test(requested) || requested === '/invite') ? requested : '/dashboard';
    req.session.oidc = { verifier, state, nonce, startedAt: Date.now(), returnTo };
    await save(req);
    return { url: oidc.buildAuthorizationUrl(config, {
      redirect_uri: `${webOrigin()}/v1/auth/callback`, scope: 'openid email profile',
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256', state, nonce,
    }).href };
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const flow = req.session.oidc;
    delete req.session.oidc;
    await save(req); // Consume pending flow before exchanging the code.
    if (!flow || Date.now() - flow.startedAt > 10 * 60 * 1000) return res.redirect(`${webOrigin()}/login?error=expired`);
    try {
      const config = await configuration();
      const tokens = await oidc.authorizationCodeGrant(config, new URL(req.originalUrl, webOrigin()), {
        pkceCodeVerifier: flow.verifier, expectedState: flow.state, expectedNonce: flow.nonce, idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims || typeof claims.sub !== 'string' || claims.email_verified !== true || typeof claims.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email) || claims.email.length > 254) {
        throw new UnauthorizedException('A verified email is required');
      }
      const email = claims.email.trim().toLowerCase();
      const issuer = config.serverMetadata().issuer;
      const displayName = typeof claims.name === 'string' ? claims.name.slice(0, 100) : email.split('@')[0];
      const db = database();
      const identity = await db.oAuthIdentity.findUnique({ where: { issuer_subject: { issuer, subject: claims.sub } } });
      // Never automatically link different issuer/subject identities by email.
      const user = identity
        ? await db.user.update({ where: { id: identity.userId }, data: { email, displayName } })
        : await db.user.create({ data: { email, displayName, identities: { create: { issuer, subject: claims.sub } } } });
      await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.userId = user.id;
      req.session.authenticatedAt = Date.now();
      req.session.csrf = randomToken();
      await save(req);
      return res.redirect(`${webOrigin()}${flow.returnTo}`);
    } catch (error) {
      console.warn("OIDC sign-in rejected", (error as { name?: string }).name, (error as { code?: string }).code ?? "validation");
      // Do not expose codes, tokens, provider claims or database errors.
      return res.redirect(`${webOrigin()}/login?error=signin`);
    }
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    await new Promise<void>((resolve, reject) => req.session.destroy(error => error ? reject(error) : resolve()));
    res.clearCookie(cookieName(), { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    res.json({ ok: true });
  }
}
