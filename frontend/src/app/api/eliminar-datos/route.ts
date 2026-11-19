import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Registra una solicitud de eliminación de datos (derecho al olvido).
 * No borra nada: un administrador verifica la identidad y la ejecuta desde
 * /dashboard/admin. La respuesta es la misma exista o no el correo, para no
 * revelar quién se ha postulado.
 */
export async function POST(req: NextRequest) {
  let body: { email?: unknown; motivo?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const motivo = typeof body.motivo === 'string' ? body.motivo.trim().slice(0, 500) : ''

  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Ingresa un correo electrónico válido.' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

  const { error } = await createAdminClient()
    .from('solicitudes_eliminacion')
    .insert({ email, motivo: motivo || null, ip_solicitud: ip })

  // 23505 = ya hay una solicitud pendiente para ese correo: se responde igual.
  if (error && error.code !== '23505') {
    console.error('Error registrando solicitud de eliminación:', error.message)
    return NextResponse.json(
      { error: 'No pudimos registrar tu solicitud. Intenta de nuevo más tarde.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
