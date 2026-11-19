import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, obtenerAdminActual } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Resuelve una solicitud de eliminación (solo admin).
 * body: { accion: 'ejecutar' | 'rechazar', nota?: string }
 * 'ejecutar' borra los CVs del storage, las evaluaciones y los candidatos con ese correo.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await obtenerAdminActual()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await params
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  let body: { accion?: unknown; nota?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  const accion = body.accion
  const nota = typeof body.nota === 'string' ? body.nota.trim().slice(0, 500) : ''
  if (accion !== 'ejecutar' && accion !== 'rechazar') {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: solicitud, error: errSolicitud } = await supabase
    .from('solicitudes_eliminacion')
    .select('id, email, estado')
    .eq('id', id)
    .single()

  if (errSolicitud || !solicitud) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }
  if (solicitud.estado !== 'pendiente') {
    return NextResponse.json({ error: 'La solicitud ya fue resuelta' }, { status: 409 })
  }

  let eliminados = 0

  try {
    if (accion === 'ejecutar') {
      const { data: candidatos, error: errBusqueda } = await supabase
        .from('candidatos')
        .select('id, cv_url, cv_nombre_archivo')
        .eq('email', solicitud.email)
      if (errBusqueda) throw errBusqueda

      const lista = candidatos ?? []
      const ids = lista.map(c => c.id)

      if (ids.length > 0) {
        const rutas = lista
          .map(c => c.cv_nombre_archivo || c.cv_url?.split('/cvs/')[1])
          .filter((r): r is string => Boolean(r))
        if (rutas.length > 0) {
          const { error } = await supabase.storage.from('cvs').remove(rutas)
          if (error) throw error
        }

        const { error: errEval } = await supabase.from('evaluaciones').delete().in('candidato_id', ids)
        if (errEval) throw errEval

        const { error: errCand } = await supabase.from('candidatos').delete().in('id', ids)
        if (errCand) throw errCand
      }
      eliminados = ids.length
    }

    const { error: errUpdate } = await supabase
      .from('solicitudes_eliminacion')
      .update({
        estado: accion === 'ejecutar' ? 'completada' : 'rechazada',
        resuelta_en: new Date().toISOString(),
        resuelta_por: admin.id,
        resuelta_por_email: admin.email,
        candidatos_eliminados: accion === 'ejecutar' ? eliminados : null,
        nota_resolucion: nota || null,
      })
      .eq('id', id)
    if (errUpdate) throw errUpdate
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : (e as { message?: string })?.message
    console.error('Error resolviendo solicitud de eliminación:', mensaje)
    return NextResponse.json({ error: 'No se pudo completar la operación' }, { status: 500 })
  }

  // Registro en auditoría (no bloquea si falla). No se guarda el correo del titular.
  await supabase.from('auditoria').insert({
    user_id: admin.id,
    user_email: admin.email,
    accion: accion === 'ejecutar' ? 'derecho_olvido' : 'rechazo_derecho_olvido',
    entidad: 'solicitudes_eliminacion',
    entidad_id: id,
    detalle: { candidatos_eliminados: eliminados },
  }).then(({ error }) => {
    if (error) console.error('No se pudo registrar auditoría:', error.message)
  })

  return NextResponse.json({ ok: true, candidatos_eliminados: eliminados })
}
