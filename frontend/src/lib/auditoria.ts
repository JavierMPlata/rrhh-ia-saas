import { createClient } from '@/lib/supabase'

export async function registrarAuditoria(
  accion: string,
  entidad?: string,
  entidad_id?: string,
  detalle?: any
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('auditoria').insert({
    user_id: user.id,
    user_email: user.email,
    accion,
    entidad,
    entidad_id,
    detalle
  })
}