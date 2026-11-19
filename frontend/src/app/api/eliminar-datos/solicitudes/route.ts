import { NextResponse } from 'next/server'
import { createAdminClient, obtenerAdminActual } from '@/lib/supabase-server'

/** Lista las solicitudes de eliminación (solo admin), con cuántas postulaciones coinciden. */
export async function GET() {
  const admin = await obtenerAdminActual()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const supabase = createAdminClient()
  const { data: solicitudes, error } = await supabase
    .from('solicitudes_eliminacion')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pendientes = (solicitudes ?? []).filter(s => s.estado === 'pendiente')
  const emails = Array.from(new Set(pendientes.map(s => s.email as string)))
  const coincidencias: Record<string, { nombre: string; telefono: string | null; created_at: string }[]> = {}

  if (emails.length > 0) {
    const { data: candidatos } = await supabase
      .from('candidatos')
      .select('email, nombre_completo, telefono, created_at')
      .in('email', emails)
    for (const c of candidatos ?? []) {
      (coincidencias[c.email] ??= []).push({
        nombre: c.nombre_completo,
        telefono: c.telefono,
        created_at: c.created_at,
      })
    }
  }

  return NextResponse.json({
    solicitudes: (solicitudes ?? []).map(s => ({
      ...s,
      postulaciones: s.estado === 'pendiente' ? (coincidencias[s.email] ?? []) : undefined,
    })),
  })
}
