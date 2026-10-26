'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, type Session } from '../lib/api';
export function AccountNav({ name }: { name: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true); setError('');
    try { const s = await api<Session>('/auth/session'); await api('/auth/logout', { method: 'POST', csrf: s.csrfToken }); window.location.assign('/login'); }
    catch { setError('Could not sign out. Please retry.'); setBusy(false); }
  }
  return <header className="account-nav"><Link href="/dashboard" className="account-brand">WorkSphere<span>AI</span></Link><nav aria-label="Account navigation"><Link href="/dashboard">Dashboard</Link><Link href="/organizations">Organizations</Link><Link href="/invite">Accept invitation</Link></nav><div className="account-person"><span>{name}</span><button onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button></div>{error && <p role="alert">{error}</p>}</header>;
}
