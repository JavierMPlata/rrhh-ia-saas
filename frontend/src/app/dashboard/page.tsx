'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Candidato, Evaluacion, Vacante, PerfilUsuario } from '@/lib/supabase'
import Estadisticas from '@/components/Estadisticas'
import ExportarCandidatos from '@/components/ExportarCandidatos'
import { registrarAuditoria } from '@/lib/auditoria'

type CandidatoConEvaluacion = Candidato & {
  evaluaciones?: Evaluacion[]
  vacantes?: { titulo: string; departamento: string }
}

type VacanteConConteo = Vacante & { total_candidatos: number }

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [candidatos, setCandidatos] = useState<CandidatoConEvaluacion[]>([])
  const [vacantes, setVacantes] = useState<VacanteConConteo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data: perfilData } = await supabase
        .from('perfiles_usuario')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setPerfil(perfilData as PerfilUsuario)

      await registrarAuditoria('acceso_dashboard')
      await cargarDatos()
    })
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const [candidatosRes, vacantesRes] = await Promise.all([
      supabase.from('candidatos')
        .select('*, evaluaciones(*), vacantes(titulo, departamento)')
        .order('created_at', { ascending: false }),
      supabase.from('vacantes').select('*').order('created_at', { ascending: false })
    ])

    const candidatosData = (candidatosRes.data || []) as CandidatoConEvaluacion[]
    setCandidatos(candidatosData)

    const vacantesConConteo = ((vacantesRes.data || []) as Vacante[]).map(v => ({
      ...v,
      total_candidatos: candidatosData.filter(c => c.vacante_id === v.id).length
    }))
    setVacantes(vacantesConConteo)
    setLoading(false)
  }

  const cerrarSesion = async () => {
    await registrarAuditoria('cierre_sesion')
    await supabase.auth.signOut()
    router.push('/login')
  }

  const estadoColor: Record<string, string> = {
    activa: 'bg-green-100 text-green-700',
    pausada: 'bg-amber-100 text-amber-700',
    cerrada: 'bg-red-100 text-red-700',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"/>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-900 text-sm">Panel de RRHH</span>
          {perfil?.rol === 'admin' && (
            <Link href="/dashboard/admin" className="text-indigo-600 hover:underline text-sm">
              Administración
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ExportarCandidatos candidatos={candidatos} />
          <button onClick={cerrarSesion} className="text-gray-500 hover:text-gray-900 text-sm">
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <Estadisticas candidatos={candidatos} />

        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Vacantes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vacantes.map(v => (
              <Link
                key={v.id}
                href={`/dashboard/vacante/${v.id}`}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{v.titulo}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${estadoColor[v.estado]}`}>
                    {v.estado}
                  </span>
                </div>
                <p className="text-gray-500 text-sm">{v.departamento} · {v.modalidad}</p>
                <p className="text-indigo-600 text-sm font-medium mt-3">
                  {v.total_candidatos} candidato{v.total_candidatos !== 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
