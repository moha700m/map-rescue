import { NextRequest, NextResponse } from 'next/server';
import { getTokens } from '@/lib/google';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`/google?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect('/google?error=no_code');
  }

  try {
    const tokens = await getTokens(code);
    // Store refresh_token securely in Supabase (encrypted) in production
    return NextResponse.redirect('/google?connected=1');
  } catch (err: any) {
    return NextResponse.redirect(`/google?error=${encodeURIComponent(err.message)}`);
  }
}