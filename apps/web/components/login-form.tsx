'use client';
import { useEffect, useState } from 'react';
import { api, type Session } from '../lib/api';
export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const error = new URLSearchParams(window.location.search).get('error'); if (error) setError(error === 'signin' ? 'Sign-in could not be completed. Use an account with a verified email, or contact your administrator.' : 'Your session or sign-in service is unavailable. Please try again.'); }, []);
  async function login() {
    setBusy(true); setError('');
    try {
      const session = await api<Session>('/auth/session');
      const returnTo = new URLSearchParams(window.location.search).get('returnTo');
      const result = await api<{ url: string }>('/auth/login', { method: 'POST', csrf: session.csrfToken, body: { returnTo } });
      window.location.assign(result.url);
    } catch (error) { setError(error instanceof Error ? error.message : 'Sign-in unavailable'); setBusy(false); }
  }
  return <div className="auth-card"><span className="eyebrow">YOUR WORK, TOGETHER</span><h1>Welcome to WorkSphere</h1><p>One secure place for your organizations and your team.</p>{error && <div className="notice error" role="alert">{error}</div>}<button className="primary" disabled={busy} onClick={login}>{busy ? 'Connecting securely…' : 'Continue with your identity provider'}<span aria-hidden="true"> →</span></button><p className="small">Use the verified email address associated with your invitation. WorkSphere never asks for your provider password.</p><a href="/">Explore the sample dashboard</a></div>;
}
