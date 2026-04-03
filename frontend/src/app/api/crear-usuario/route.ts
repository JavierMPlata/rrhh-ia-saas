import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, nombre, rol } = await request.json()

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) throw new Error(authError.message)

    // Crear perfil con rol
    const { error: perfilError } = await supabaseAdmin
      .from('perfiles_usuario')
      .insert({
        user_id: authData.user.id,
        nombre_completo: nombre,
        rol: rol,
        activo: true
      })

    if (perfilError) throw new Error(perfilError.message)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}