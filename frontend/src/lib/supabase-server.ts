// Solo para rutas de servidor (usa la service key). No importar desde componentes cliente.
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

/** Cliente con service key: ignora RLS. Usar solo en rutas de servidor. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export type AdminActual = { id: string; email: string }

/**
 * Devuelve el usuario de la sesión (cookies) si es admin activo; si no, null.
 * El rol se lee con la service key para no depender de las políticas RLS.
 */
export async function obtenerAdminActual(): Promise<AdminActual | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* las rutas de API no refrescan la sesión */ },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await createAdminClient()
    .from('perfiles_usuario')
    .select('rol, activo')
    .eq('user_id', user.id)
    .single()

  if (!perfil || !perfil.activo || perfil.rol !== 'admin') return null
  return { id: user.id, email: user.email ?? '' }
}
