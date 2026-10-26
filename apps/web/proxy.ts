import { NextRequest, NextResponse } from 'next/server';
export async function proxy(request: NextRequest) {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000'}/v1/auth/session`, { headers: { cookie: request.headers.get('cookie') ?? '' }, cache: 'no-store' });
    if (response.ok && (await response.json()).user) return NextResponse.next();
  } catch { /* Fail closed; health and public preview remain available. */ }
  return NextResponse.redirect(new URL('/login', request.url));
}
export const config = { matcher: ['/dashboard/:path*', '/organizations/:path*'] };
