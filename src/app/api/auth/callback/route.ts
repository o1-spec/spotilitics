import { NextResponse } from 'next/server';
// Preserve the prior callback path while the developer dashboard URI is updated.
export async function GET(request: Request) {
  const target = new URL(request.url);
  target.pathname = '/api/auth/callback/spotify';
  return NextResponse.redirect(target);
}
