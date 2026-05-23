import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Parámetros vigilados ───────────────────────────────────────────────────
// Todos los parámetros del formulario público se validan explícitamente.
// Además, urlTienePeligro() escanea TODOS los query params de cualquier ruta.
const PARAMETROS_VIGILADOS = [
  'ciudad', 'nombre_completo', 'telefono', 'email', 'vacante_id',
]

// Regex UUID v4 estricto: vacante_id debe ser UUID válido o string vacío
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

  // SQL injection — palabras clave y operadores
  ' union ', ' or 1', ' and 1',
  "'--", ';--', '" or "', "' or '",
  'drop table', 'insert into', 'select *',
  ' and 1=', ' or 1=',
  // SQL boolean-based blind (ZAP probe patterns)
  ' and 1=1', ' and 1=2', ' or 1=1',
  'union all select', 'union all ',
  '+and+', '+or+', '+union+',

  // Open redirect / SSRF con protocolo
  'http://', 'https://', 'ftp://', '://',
  // Open redirect sin protocolo
  'www.',

  // Null bytes
  '%00', '\x00',

  // Misc
  'alert(', 'prompt(', 'confirm(', 'eval(',

  // Command injection probes comunes de ZAP/Burp
  'get-help',
  ';get-help',
  '|get-help',
  '`get-help',
  '$(get-help)',
]

// Caracteres individuales que son suficientes para bloquear en query params
const CHARS_PELIGROSOS = [
  "'",    // comilla simple — SQL injection
  '"',    // comilla doble — SQL / XSS
  ';',    // punto y coma — SQL / command injection
  '`',    // backtick — command injection
]

// Dominios de callback SSRF
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

  // Valor exactamente '/' o que empiece con '/' (path traversal relativo)
  if (decoded === '/' || decoded.startsWith('/')) return true

  // Caracteres peligrosos solos o en combinación simple
  for (const ch of CHARS_PELIGROSOS) {
    if (decoded.includes(ch)) return true
  }

  // SSTI — detección por patrón de marcador aritmético
  if (esSSTI(decoded)) return true

  // Patrones textuales de la lista
  if (PATRONES_PELIGROSOS.some(p => decodedLower.includes(p.toLowerCase()))) return true

  // Dominios de callback SSRF
  if (DOMINIOS_SSRF.some(d => decodedLower.includes(d.toLowerCase()))) return true

  return false
}

/**
 * Valida el parámetro vacante_id: si está presente y no vacío, debe ser UUID v4.
 * Esto bloquea payloads como "thishouldnotexistandhopefullyitwillnot" o "0W45pz4p".
 */
function esVacanteIdInvalido(valor: string | null): boolean {
  if (!valor || valor === '') return false
  return !UUID_REGEX.test(valor)
}

function urlTienePeligro(request: NextRequest): boolean {
  const params = request.nextUrl.searchParams

  // Si no hay query params, no hay nada que validar
  if (!params.toString()) return false

  // Validación específica de vacante_id: debe ser UUID válido o vacío
  if (esVacanteIdInvalido(params.get('vacante_id'))) return true

  // Revisar parámetros vigilados explícitamente
  for (const param of PARAMETROS_VIGILADOS) {
    const valor = params.get(param)
    if (valor && esValorPeligroso(valor)) return true
  }

  // Revisar TODOS los query params — cubre favicon.ico y params arbitrarios
  // Esto bloquea ataques como /favicon.ico?favicon.0x3d=+AND+1%3D1+--+
  for (const [, val] of params.entries()) {
    if (esValorPeligroso(val)) return true
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

// ── Middleware principal ───────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  // 1. Bloquear inyecciones en query params — 403 real con security headers
  //    Se aplica a TODAS las rutas, incluidas /favicon.ico, /_next/*, etc.
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
    // Aplica a TODAS las rutas, incluyendo favicon.ico y archivos estáticos.
    // La excepción de _next/static y _next/image se elimina intencionalmente
    // para que los query params en esas rutas también sean validados.
    '/(.*)',
  ],
}
