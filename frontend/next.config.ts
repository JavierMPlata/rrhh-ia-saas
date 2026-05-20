import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // A04 — Evita Clickjacking, nadie puede embeber el sitio en iframe
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // A03 — Evita MIME sniffing, el navegador no adivina el tipo de archivo
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // A02 — Fuerza HTTPS por 1 año incluyendo subdominios
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // A03 — Bloquea XSS reflejado en navegadores legacy
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // A05 — Controla información de referrer enviada a terceros
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // A05 — Deshabilita APIs del navegador innecesarias
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // A03 — CSP: solo permite recursos desde dominios autorizados USB
          {
            key: 'Content-Security-Policy',
            value: [
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
          },
        ],
      },
    ]
  },
}

export default nextConfig