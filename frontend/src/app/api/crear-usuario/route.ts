import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, obtenerAdminActual } from '@/lib/supabase-server'

const ROLES_VALIDOS = ['admin', 'rrhh_senior', 'rrhh_junior'] as const
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Crea una cuenta interna con su perfil y rol. Solo para administradores activos. */
export async function POST(request: NextRequest) {
  const admin = await obtenerAdminActual()
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  let body: { email?: unknown; password?: unknown; nombre?: unknown; rol?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim().slice(0, 100) : ''
  const rol = body.rol

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
  }
  if (password.length < 10) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 10 caracteres' }, { status: 400 })
  }
  if (!nombre) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }
  if (typeof rol !== 'string' || !(ROLES_VALIDOS as readonly string[]).includes(rol)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'No se pudo crear el usuario' }, { status: 400 })
  }

  const { error: perfilError } = await supabase.from('perfiles_usuario').insert({
    user_id: authData.user.id,
    nombre_completo: nombre,
    rol,
    activo: true,
  })
  if (perfilError) {
    // Sin perfil la cuenta quedaría a medias: se revierte.
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: perfilError.message }, { status: 400 })
  }

  await supabase.from('auditoria').insert({
    user_id: admin.id,
    user_email: admin.email,
    accion: 'crear_usuario',
    entidad: 'perfiles_usuario',
    entidad_id: authData.user.id,
    detalle: { email, rol },
  }).then(({ error }) => {
    if (error) console.error('No se pudo registrar auditoría:', error.message)
  })

  return NextResponse.json({ success: true })
}
