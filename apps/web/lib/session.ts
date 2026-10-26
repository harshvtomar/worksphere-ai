import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function requireUser() {
  const cookie = (await cookies()).toString();
  let response: Response;
  try {
    response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000'}/v1/auth/session`, { headers: { cookie }, cache: 'no-store' });
  } catch { redirect('/login?error=unavailable'); }
  if (!response.ok) redirect('/login?error=expired');
  const session = await response.json();
  if (!session.user) redirect('/login');
  return session as { user: { id: string; email: string; displayName: string }; activeOrganizationId: string | null };
}
