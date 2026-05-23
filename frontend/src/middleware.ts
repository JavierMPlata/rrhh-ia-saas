import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Rutas SPA que NO deben recibir ningún query param ─────────────────────
// Cualquier request a estas rutas con query params es sospechoso y se bloquea
// con un redirect limpio (sin 403, para no revelar info al atacante).
const RUTAS_SPA_SIN_PARAMS = ['/', '/privacidad', '/eliminar-datos']

// Patrones vigilados — se inspeccionan en rutas que SÍ pueden tener params
const PARAMETROS_VIGILADOS = [
  'ciudad', 'nombre_completo', 'telefono', 'email', 'vacante_id',
]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PATRONES_PELIGROSOS = [
  // Path traversal
  '../', '..\\', '/etc/', 'c:\\', 'c:/',
  'system.ini', 'win.ini', 'web-inf',

  // XSS / HTML injection
  '<script', '<img', '<svg', '<iframe', '<object', '<embed',
  'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus',
  'javascript:', 'vbscript:', 'data:text', 'data:image/svg',

  // XML / XPath injection
  '<!--',
  ']]>',
  '<!entity',
  '<!doctype',

  // Template injection
  '{{', '}}', '${', '#{', '<%', '%>',
  '{#',
  '{@',

  // SSI injection
  '#exec', '#include',

  // SQL injection
  ' union ', ' or 1', ' and 1',
  "'--", ';--', '" or "', "' or '",
  'drop table', 'insert into', 'select *',
  ' and 1=', ' or 1=',
  ' and 1=1', ' and 1=2', ' or 1=1',
  'union all select', 'union all ',
  '+and+', '+or+', '+union+',

  // Open redirect / SSRF
  'http://', 'https://', 'ftp://', '://',
  'www.',

  // Null bytes
  '%00', '\x00',

  // Misc
  'alert(', 'prompt(', 'confirm(', 'eval(',

  // Command injection probes
  'get-help',
  ';get-help',
  '|get-help',
  '`get-help',
  '$(get-help)',
]

const CHARS_PELIGROSOS = ["'", '"', ';', '`']

const DOMINIOS_SSRF = [
  '.owasp.org',
  '.burpcollaborator.net',
  '.interact.sh',
  '.canarytokens.com',
  '.ngrok.io',
  '.ngrok-free.app',
  'localtest.me',
  '169.254.',
  '127.',
  '0.0.0.0',
  '::1',
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

function decodeSafe(valor: string): string {
  try { return decodeURIComponent(valor) } catch { return valor }
}

function esSSTI(decoded: string): boolean {
  if (/zj[\s+{][\d#@]/.test(decoded)) return true
  if (/zj\s*\*\s*\d/.test(decoded)) return true
  if (/\{@math\s+key=/i.test(decoded)) return true
  return false
}

function esValorPeligroso(valor: string): boolean {
  const decoded = decodeSafe(valor).trim()
  const decodedLower = decoded.toLowerCase()

  if (decoded === '/' || decoded.startsWith('/')) return true

  for (const ch of CHARS_PELIGROSOS) {
    if (decoded.includes(ch)) return true
  }

  if (esSSTI(decoded)) return true

  if (PATRONES_PELIGROSOS.some(p => decodedLower.includes(p.toLowerCase()))) return true

  if (DOMINIOS_SSRF.some(d => decodedLower.includes(d.toLowerCase()))) return true

  return false
}

function esVacanteIdInvalido(valor: string | null): boolean {
  if (!valor || valor === '') return false
  return !UUID_REGEX.test(valor)
}

/**
 * Devuelve true si la URL contiene query params sospechosos.
 * Solo se usa en rutas que SÍ pueden aceptar params (login con ?error=).
 */
function urlTienePeligro(request: NextRequest): boolean {
  const params = request.nextUrl.searchParams
  if (!params.toString()) return false

  if (esVacanteIdInvalido(params.get('vacante_id'))) return true

  for (const param of PARAMETROS_VIGILADOS) {
    const valor = params.get(param)
    if (valor && esValorPeligroso(valor)) return true
  }

  for (const [, val] of params.entries()) {
    if (esValorPeligroso(val)) return true
  }

  return false
}

/**
 * Elimina los query params de la URL haciendo un redirect limpio (301).
 * Preferimos redirect sobre 403 en rutas SPA para no filtrar información.
 */
function stripQueryParams(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone()
  url.search = ''
  return NextResponse.redirect(url, { status: 301, headers: SECURITY_HEADERS })
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

// ── Middleware principal ───────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const tieneQueryParams = request.nextUrl.searchParams.toString().length > 0

  // 1. Rutas SPA que NUNCA usan query params → redirect limpio al path base
  //    Esto cubre el probe de ZAP: /?ciudad=ZAP&email=...&nombre_completo=ZAP
  //    y cualquier intento de reflected parameter injection.
  if (RUTAS_SPA_SIN_PARAMS.includes(pathname) && tieneQueryParams) {
    return stripQueryParams(request)
  }

  // 2. Archivos estáticos / favicon con query params → redirect limpio
  //    Cubre el probe: /favicon.ico?favicon.0x3d=...
  const esEstatico =
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')

  if (esEstatico && tieneQueryParams) {
    return stripQueryParams(request)
  }

  // 3. Para el resto de rutas, inspeccionar el contenido de los params
  if (tieneQueryParams && urlTienePeligro(request)) {
    return forbidden()
  }

  // ── Autenticación Supabase ─────────────────────────────────────────────
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
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Si tiene sesión, verificar que el usuario esté activo
  if (pathname.startsWith('/dashboard') && user) {
    const { data: perfil } = await supabase
      .from('perfiles_usuario')
      .select('activo, rol')
      .eq('user_id', user.id)
      .single()

    if (perfil && !perfil.activo) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      url.searchParams.set('error', 'cuenta_inactiva')
      return NextResponse.redirect(url)
    }

    if (
      pathname.startsWith('/dashboard/admin') &&
      perfil?.rol !== 'admin'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // Ya logueado intentando ir al login → redirigir al dashboard
  if (pathname === '/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/(.*)',
  ],
}