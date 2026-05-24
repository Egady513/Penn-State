import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Guard: skip Supabase entirely if env vars aren't configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              supabaseResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      // Refresh session — required for Server Components
      const { data: { user } } = await supabase.auth.getUser()

      // Admin routes require authentication
      const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
      const isLoginRoute = request.nextUrl.pathname === '/admin/login'

      if (isAdminRoute && !isLoginRoute && !user) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }

      if (isLoginRoute && user) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } catch (err) {
      // Supabase error — let the request through so the app at least renders
      console.error('[proxy] Supabase session refresh failed:', err)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
