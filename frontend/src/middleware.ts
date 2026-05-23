import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Parámetros que ZAP/scanners intentan inyectar ──────────────────────────
const PARAMETROS_VIGILADOS = [
  'ciudad', 'nombre_completo', 'telefono', 'email', 'vacante_id',
]

const PATRONES_PELIGROSOS = [
  '../', '..\\',
  '/etc/', 'c:\\', 'c:/',
  'system.ini', 'win.ini', 'web-inf',
  '<script', '<img', '<svg',
  'onerror', 'onload', 'onclick',
  'javascript:', 'vbscript:', 'data:text',
  '{{', '${', '#{', '<%',
  '<!--#', '#exec', '#include',
  ' union ', ' or 1', ' and 1', "'--", ';--',
  'http://', 'https://', '://',
  '%00', '\x00',
  'alert(', 'prompt(', 'confirm(',
]

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://*.supabase.co https://rrhh-ia-saas-production.up.railway.app https://rrhh-ia.app.n8n.cloud",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
}

function esPeligroso(valor: string): boolean {
  const decoded = (() => {
    try { return decodeURIComponent(valor) } catch { return valor }
  })().toLowerCase()
  return PATRONES_PELIGROSOS.some(p => decoded.includes(p.toLowerCase()))
}

function urlTienePeligro(request: NextRequest): boolean {
  const params = request.nextUrl.searchParams

  // Revisar parámetros sensibles conocidos
  for (const param of PARAMETROS_VIGILADOS) {
    const valor = params.get(param)
    if (valor && esPeligroso(valor)) return true
  }

  // Revisar TODOS los query params (cubre favicon y params arbitrarios)
  for (const [, val] of params.entries()) {
    if (esPeligroso(val)) return true
  }

  return false
}

function forbidden(): NextResponse {
  return new NextResponse('Forbidden', {
    status: 403,
    headers: {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

// ── Middleware principal ────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  // 1. Bloquear inyecciones en query params — 403 real con security headers
  if (urlTienePeligro(request)) {
    return forbidden()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Sin sesión intentando entrar al dashboard → redirigir al login
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si tiene sesión, verificar que el usuario esté activo
  if (request.nextUrl.pathname.startsWith('/dashboard') && user) {
    const { data: perfil } = await supabase
      .from('perfiles_usuario')
      .select('activo, rol')
      .eq('user_id', user.id)
      .single()

    // Si el perfil existe y está inactivo → cerrar sesión y redirigir
    if (perfil && !perfil.activo) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'cuenta_inactiva')
      return NextResponse.redirect(url)
    }

    // Si intenta ir a /admin sin ser admin → redirigir al dashboard
    if (
      request.nextUrl.pathname.startsWith('/dashboard/admin') &&
      perfil?.rol !== 'admin'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Ya logueado intentando ir al login → redirigir al dashboard
  if (request.nextUrl.pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto assets estáticos de Next.js.
     * Esto garantiza que el bloqueo de inyecciones cubra también /favicon.ico
     * y cualquier otra ruta que ZAP intente usar como vector.
     */
    '/((?!_next/static|_next/image).*)',
  ],
}