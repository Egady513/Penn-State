import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js 16 proxy (replaces middleware.ts).
 *
 * Supabase auth session refresh has been moved out of the Edge Runtime
 * because @supabase/ssr fails to initialize in Vercel's Edge Runtime.
 * Admin route protection will be handled server-side once we wire up
 * real Supabase auth (currently mocked).
 *
 * For now this is a clean pass-through so every route renders correctly.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
