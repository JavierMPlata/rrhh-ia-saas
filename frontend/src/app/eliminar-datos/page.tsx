import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    // Buscar candidatos con ese email
    const { data: candidatos, error: errorBusqueda } = await supabase
      .from('candidatos')
      .select('id, cv_url')
      .eq('email', email)

    if (errorBusqueda) throw errorBusqueda

    if (!candidatos || candidatos.length === 0) {
      return NextResponse.json(
        { error: 'No encontramos datos asociados a ese correo electrónico.' },
        { status: 404 }
      )
    }

    const ids = candidatos.map(c => c.id)

    // Eliminar CVs del storage
    for (const candidato of candidatos) {
      if (candidato.cv_url) {
        const path = candidato.cv_url.split('/cvs/')[1]
        if (path) {
          await supabase.storage.from('cvs').remove([path])
        }
      }
    }

    // Eliminar evaluaciones
    await supabase.from('evaluaciones').delete().in('candidato_id', ids)

    // Eliminar candidatos
    await supabase.from('candidatos').delete().in('id', ids)

    // Registrar en auditoría
    await supabase.from('auditoria').insert({
      user_id: 'sistema',
      user_email: 'sistema@derecho-olvido',
      accion: 'derecho_olvido',
      entidad: 'candidatos',
      detalle: { email, candidatos_eliminados: ids.length }
    })

    return NextResponse.json({
      ok: true,
      message: `Datos eliminados correctamente. Se eliminaron ${ids.length} registro(s).`
    })

  } catch (error: any) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}