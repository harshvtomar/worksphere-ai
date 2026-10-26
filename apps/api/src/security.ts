import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    authenticatedAt?: number;
    csrf?: string;
    organizationId?: string;
    oidc?: { verifier: string; state: string; nonce: string; startedAt: number; returnTo: string };
  }
}

export const randomToken = () => randomBytes(32).toString('hex');
export const cookieName = () => process.env.NODE_ENV === 'production' ? '__Host-ws.sid' : 'ws.sid';
export function webOrigin() {
  const value = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const url = new URL(value);
  if (url.origin !== value || !['http:', 'https:'].includes(url.protocol)) throw new Error('WEB_ORIGIN must be an exact HTTP(S) origin');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production WEB_ORIGIN requires HTTPS');
  return value;
}
export function sessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === 'production') throw new Error('Production requires SESSION_SECRET and DATABASE_URL');
    // Health-only development remains usable. No auth fallback or memory sessions.
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/v1/health' || req.path === '/v1/info') return next();
      res.status(503).json({ message: 'Authentication is not configured' });
    };
  }
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  const origin = webOrigin();
  const Store = connectPg(session);
  const middleware = session({
    name: cookieName(), secret,
    store: new Store({ conString: process.env.DATABASE_URL, createTableIfMissing: false, pruneSessionInterval: 300 }),
    resave: false, saveUninitialized: false, rolling: true,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 60 * 1000, path: '/' },
  });
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/v1/health' || req.path === '/v1/info') return next();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    middleware(req, res, (error?: unknown) => {
      if (error) {
        console.warn('Session store failure', (error as { code?: string }).code ?? 'unavailable');
        // Session persistence can fail after the response has begun. Delegate late
        // errors to Express instead of writing headers twice and crashing Node.
        if (res.headersSent) { next(error); return; }
        res.status(503).json({ message: 'Session service unavailable' }); return;
      }
      if (req.session.authenticatedAt && Date.now() - req.session.authenticatedAt >= 8 * 60 * 60 * 1000) {
        req.session.destroy(() => { res.clearCookie(cookieName(), { path: '/' }); res.status(401).json({ message: 'Session expired. Sign in again.' }); });
        return;
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const actual = req.get('x-csrf-token') ?? '';
        const expected = req.session.csrf ?? '';
        if (req.get('origin') !== origin || !expected || !/^[a-f0-9]{64}$/.test(actual) || actual.length !== expected.length || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
          res.status(403).json({ message: 'Invalid request origin or CSRF token' }); return;
        }
      }
      next();
    });
  };
}

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.session?.userId) throw new UnauthorizedException('Sign in to continue');
    return true;
  }
}
