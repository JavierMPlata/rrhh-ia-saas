'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Candidato, Evaluacion, Vacante } from '@/lib/supabase'
import Estadisticas from '@/components/Estadisticas'
import ExportarCandidatos from '@/components/ExportarCandidatos'

type CandidatoConEvaluacion = Candidato & {
  evaluaciones?: Evaluacion[]
  vacantes?: { titulo: string; departamento: string }
}

const ESTADOS_COLOR: Record<string, string> = {
  recibido:        'bg-gray-100 text-gray-600',
  en_proceso:      'bg-blue-100 text-blue-700',
  analizado:       'bg-purple-100 text-purple-700',
  preseleccionado: 'bg-green-100 text-green-700',
  descartado:      'bg-red-100 text-red-700',
  banco_talentos:  'bg-amber-100 text-amber-700',
}

const ESTADOS_ETIQUETA: Record<string, string> = {
  recibido:        'Recibido',
  en_proceso:      'En proceso',
  analizado:       'Analizado',
  preseleccionado: 'Preseleccionado',
  descartado:      'Descartado',
  banco_talentos:  'Banco de talentos',
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [pestana, setPestana] = useState<'candidatos' | 'vacantes' | 'estadisticas'>('candidatos')
  const [candidatos, setCandidatos] = useState<CandidatoConEvaluacion[]>([])
  const [vacantes, setVacantes] = useState<Vacante[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [ordenarPor, setOrdenarPor] = useState<'fecha' | 'score'>('score')
  const [candidatoSeleccionado, setCandidatoSeleccionado] = useState<CandidatoConEvaluacion | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [modalVacante, setModalVacante] = useState(false)
  const [vacanteEditar, setVacanteEditar] = useState<Vacante | null>(null)

  const cargarCandidatos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('candidatos')
      .select('*, evaluaciones(*), vacantes(titulo, departamento)')
      .order('created_at', { ascending: false })
    if (data) setCandidatos(data as CandidatoConEvaluacion[])
    setLoading(false)
  }, [])

  const cargarVacantes = useCallback(async () => {
    const { data } = await supabase
      .from('vacantes')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setVacantes(data as Vacante[])
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUserEmail(user.email || '')
        cargarCandidatos()
        cargarVacantes()
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const cambiarEstadoVacante = async (id: string, nuevoEstado: string) => {
    await supabase.from('vacantes').update({ estado: nuevoEstado }).eq('id', id)
    cargarVacantes()
  }

  const candidatosFiltrados = candidatos
    .filter(c => {
      const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado
      const matchBusqueda = !busqueda ||
        c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
        c.email.toLowerCase().includes(busqueda.toLowerCase())
      return matchEstado && matchBusqueda
    })
    .sort((a, b) => {
      if (ordenarPor === 'score') {
        const scoreA = a.evaluaciones?.[0]?.score_total ?? -1
        const scoreB = b.evaluaciones?.[0]?.score_total ?? -1
        return scoreB - scoreA
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const stats = {
    total: candidatos.length,
    preseleccionados: candidatos.filter(c => c.estado === 'preseleccionado').length,
    analizados: candidatos.filter(c => c.estado === 'analizado').length,
    descartados: candidatos.filter(c => c.estado === 'descartado').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            RH
          </div>
          <span className="font-semibold text-gray-900">Panel RRHH</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{userEmail}</span>
          <button
            onClick={() => { setVacanteEditar(null); setModalVacante(true) }}
            className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            + Nueva vacante
          </button>
          <button
            onClick={() => { cargarCandidatos(); cargarVacantes() }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Actualizar
          </button>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total candidatos', value: stats.total, color: 'text-gray-900' },
            { label: 'Preseleccionados', value: stats.preseleccionados, color: 'text-green-600' },
            { label: 'Por revisar', value: stats.analizados, color: 'text-purple-600' },
            { label: 'Descartados', value: stats.descartados, color: 'text-red-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Pestañas */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setPestana('candidatos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${pestana === 'candidatos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Candidatos ({candidatos.length})
          </button>
          <button
            onClick={() => setPestana('vacantes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${pestana === 'vacantes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Vacantes ({vacantes.length})
          </button>
          <button
            onClick={() => setPestana('estadisticas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${pestana === 'estadisticas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Estadísticas
          </button>
        </div>

        {/* Pestaña Candidatos */}
        {pestana === 'candidatos' && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todos">Todos los estados</option>
                {Object.entries(ESTADOS_ETIQUETA).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select
                value={ordenarPor}
                onChange={e => setOrdenarPor(e.target.value as 'fecha' | 'score')}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white
                           focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="score">Ordenar por score</option>
                <option value="fecha">Ordenar por fecha</option>
              </select>
              <ExportarCandidatos candidatos={candidatosFiltrados} />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"/>
                  Cargando candidatos...
                </div>
              ) : candidatosFiltrados.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  No hay candidatos con los filtros aplicados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Candidato</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Vacante</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">Score</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">IA dice</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                        <th className="text-center px-4 py-3 font-medium text-gray-600">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {candidatosFiltrados.map(c => {
                        const ev = c.evaluaciones?.[0]
                        const score = ev?.score_total ?? null
                        const scoreColor = score === null ? 'text-gray-400'
                          : score >= 80 ? 'text-green-600'
                          : score >= 60 ? 'text-amber-500'
                          : 'text-red-500'
                        const recomColor = ev?.recomendacion === 'contratar' ? 'bg-green-100 text-green-700'
                          : ev?.recomendacion === 'entrevistar' ? 'bg-blue-100 text-blue-700'
                          : ev?.recomendacion === 'descartar' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-500'
                        return (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{c.nombre_completo}</div>
                              <div className="text-gray-400 text-xs">{c.email}</div>
                              {c.ciudad && <div className="text-gray-400 text-xs">{c.ciudad}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {(c.vacantes as any)?.titulo || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium
                                               ${ESTADOS_COLOR[c.estado] || 'bg-gray-100 text-gray-600'}`}>
                                {ESTADOS_ETIQUETA[c.estado] || c.estado}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-center font-bold text-lg ${scoreColor}`}>
                              {score !== null ? score.toFixed(1) : '—'}
                              {ev?.alerta_sesgo && (
                                <span title="Alerta de sesgo" className="ml-1 text-amber-500 text-sm">⚠️</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {ev?.recomendacion ? (
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${recomColor}`}>
                                  {ev.recomendacion}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {new Date(c.created_at).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short', year: 'numeric'
                              })}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => setCandidatoSeleccionado(c)}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium
                                           bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Ver perfil
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Pestaña Vacantes */}
        {pestana === 'vacantes' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {vacantes.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No hay vacantes creadas aún.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Vacante</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Departamento</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Modalidad</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Candidatos</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {vacantes.map(v => {
                      const totalCandidatos = candidatos.filter(c => c.vacante_id === v.id).length
                      const estadoColor = v.estado === 'activa' ? 'bg-green-100 text-green-700'
                        : v.estado === 'pausada' ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                      return (
                        <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{v.titulo}</div>
                            <div className="text-gray-400 text-xs mt-0.5">
                              Exp. mín: {v.experiencia_minima} años · {v.educacion_requerida}
                            </div>
                            {v.salario_min && v.salario_max && (
                              <div className="text-gray-400 text-xs">
                                ${v.salario_min?.toLocaleString()} - ${v.salario_max?.toLocaleString()} COP
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">{v.departamento || '—'}</td>
                          <td className="px-4 py-3 text-gray-600 text-xs capitalize">{v.modalidad}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoColor}`}>
                              {v.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700 font-medium">{totalCandidatos}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => { setVacanteEditar(v); setModalVacante(true) }}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium
                                           bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Editar
                              </button>
                              {v.estado === 'activa' ? (
                                <button
                                  onClick={() => cambiarEstadoVacante(v.id, 'cerrada')}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium
                                             bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  Cerrar
                                </button>
                              ) : (
                                <button
                                  onClick={() => cambiarEstadoVacante(v.id, 'activa')}
                                  className="text-green-600 hover:text-green-800 text-xs font-medium
                                             bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  Activar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pestaña Estadísticas */}
        {pestana === 'estadisticas' && (
          <Estadisticas candidatos={candidatos} />
        )}
      </div>

      {modalVacante && (
        <ModalVacante
          vacante={vacanteEditar}
          onClose={() => { setModalVacante(false); setVacanteEditar(null) }}
          onGuardada={() => { setModalVacante(false); setVacanteEditar(null); cargarVacantes() }}
        />
      )}

      {candidatoSeleccionado && (
        <ModalCandidato
          candidato={candidatoSeleccionado}
          onClose={() => setCandidatoSeleccionado(null)}
          onActualizado={cargarCandidatos}
        />
      )}
    </div>
  )
}

function ModalVacante({
  vacante,
  onClose,
  onGuardada
}: {
  vacante: Vacante | null
  onClose: () => void
  onGuardada: () => void
}) {
  const supabase = createClient()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    titulo: vacante?.titulo || '',
    descripcion: vacante?.descripcion || '',
    departamento: vacante?.departamento || '',
    salario_min: vacante?.salario_min?.toString() || '',
    salario_max: vacante?.salario_max?.toString() || '',
    modalidad: vacante?.modalidad || 'hibrido',
    experiencia_minima: vacante?.experiencia_minima?.toString() || '0',
    educacion_requerida: vacante?.educacion_requerida || 'universitario',
    habilidades_requeridas: vacante?.habilidades_requeridas?.join(', ') || '',
    valores_empresa: (vacante as any)?.valores_empresa?.join(', ') || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')

    const habilidades = form.habilidades_requeridas.split(',').map(h => h.trim()).filter(h => h.length > 0)
    const valores = form.valores_empresa.split(',').map(v => v.trim()).filter(v => v.length > 0)

    const datos = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      departamento: form.departamento || null,
      salario_min: form.salario_min ? parseFloat(form.salario_min) : null,
      salario_max: form.salario_max ? parseFloat(form.salario_max) : null,
      modalidad: form.modalidad,
      experiencia_minima: parseInt(form.experiencia_minima),
      educacion_requerida: form.educacion_requerida,
      habilidades_requeridas: habilidades,
      valores_empresa: valores,
    }

    if (vacante) {
      const { error } = await supabase.from('vacantes').update(datos).eq('id', vacante.id)
      if (error) { setError('Error al actualizar: ' + error.message); setGuardando(false); return }
    } else {
      const { error } = await supabase.from('vacantes').insert({ ...datos, estado: 'activa' })
      if (error) { setError('Error al crear: ' + error.message); setGuardando(false); return }
    }

    onGuardada()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">
            {vacante ? 'Editar vacante' : 'Nueva vacante'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleGuardar} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Título del cargo *</label>
            <input name="titulo" required value={form.titulo} onChange={handleChange}
              placeholder="Ej: Desarrollador Full Stack"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción *</label>
            <textarea name="descripcion" required value={form.descripcion} onChange={handleChange} rows={3}
              placeholder="Describe el cargo..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Departamento</label>
              <input name="departamento" value={form.departamento} onChange={handleChange}
                placeholder="Ej: Tecnología"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Modalidad</label>
              <select name="modalidad" value={form.modalidad} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Salario mínimo (COP)</label>
              <input name="salario_min" type="number" value={form.salario_min} onChange={handleChange}
                placeholder="Ej: 3500000"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Salario máximo (COP)</label>
              <input name="salario_max" type="number" value={form.salario_max} onChange={handleChange}
                placeholder="Ej: 6000000"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Experiencia mínima (años)</label>
              <input name="experiencia_minima" type="number" min="0" value={form.experiencia_minima} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Educación requerida</label>
              <select name="educacion_requerida" value={form.educacion_requerida} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="bachillerato">Bachillerato</option>
                <option value="tecnico">Técnico</option>
                <option value="tecnologo">Tecnólogo</option>
                <option value="universitario">Universitario</option>
                <option value="posgrado">Posgrado</option>
                <option value="maestria">Maestría</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Habilidades requeridas <span className="text-gray-400 font-normal">(separadas por coma)</span>
            </label>
            <input name="habilidades_requeridas" value={form.habilidades_requeridas} onChange={handleChange}
              placeholder="Ej: Python, React, SQL, Git"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Valores de la empresa <span className="text-gray-400 font-normal">(separados por coma)</span>
            </label>
            <input name="valores_empresa" value={form.valores_empresa} onChange={handleChange}
              placeholder="Ej: innovacion, trabajo_en_equipo"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {guardando ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Guardando...
                </>
              ) : vacante ? 'Guardar cambios' : 'Crear vacante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalCandidato({
  candidato,
  onClose,
  onActualizado
}: {
  candidato: CandidatoConEvaluacion
  onClose: () => void
  onActualizado: () => void
}) {
  const ev = candidato.evaluaciones?.[0]
  const supabase = createClient()
  const [actualizando, setActualizando] = useState(false)

  const verCV = async () => {
    if (!candidato.cv_nombre_archivo) return
    const { data, error } = await supabase.storage
      .from('cvs')
      .createSignedUrl(candidato.cv_nombre_archivo, 120)
    if (error) { alert('No se pudo acceder al CV: ' + error.message); return }
    window.open(data.signedUrl, '_blank')
  }

  const actualizarEstado = async (nuevoEstado: string) => {
    setActualizando(true)
    await supabase.from('candidatos').update({ estado: nuevoEstado }).eq('id', candidato.id)
    onActualizado()
    onClose()
    setActualizando(false)
  }

  const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{Number(value).toFixed(1)}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${Math.min(100, Number(value))}%` }}/>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{candidato.nombre_completo}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {candidato.email}{candidato.ciudad && ` · ${candidato.ciudad}`}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
        </div>
        <div className="p-6 space-y-6">
          {ev ? (
            <div className="bg-indigo-50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900">Score total IA</h3>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    Recomendación:{' '}
                    <span className={`font-semibold capitalize
                      ${ev.recomendacion === 'contratar' ? 'text-green-600'
                        : ev.recomendacion === 'descartar' ? 'text-red-600'
                        : 'text-blue-600'}`}>
                      {ev.recomendacion}
                    </span>
                  </p>
                </div>
                <div className={`text-4xl font-bold
                  ${Number(ev.score_total) >= 80 ? 'text-green-600'
                    : Number(ev.score_total) >= 60 ? 'text-amber-500'
                    : 'text-red-500'}`}>
                  {Number(ev.score_total).toFixed(0)}
                  <span className="text-lg text-gray-400">/100</span>
                </div>
              </div>
              <ScoreBar label="Habilidades (40%)" value={Number(ev.score_habilidades)} color="bg-blue-500" />
              <ScoreBar label="Experiencia (30%)" value={Number(ev.score_experiencia)} color="bg-teal-500" />
              <ScoreBar label="Educación (20%)" value={Number(ev.score_educacion)} color="bg-purple-500" />
              <ScoreBar label="Fit cultural (10%)" value={Number(ev.score_fit_cultural)} color="bg-amber-400" />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-5 text-center text-gray-400 text-sm">
              Este candidato aún no ha sido analizado por IA.
            </div>
          )}
          {ev?.alerta_sesgo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-800">⚠️ Alerta de posible sesgo</p>
              <p className="text-xs text-amber-700 mt-1">Tipo detectado: {ev.tipo_sesgo_detectado}.</p>
            </div>
          )}
          {ev && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Resumen del perfil</h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">{ev.resumen_perfil}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Justificación IA</h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">{ev.justificacion_recomendacion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Fortalezas</h3>
                  <ul className="space-y-1.5">
                    {ev.fortalezas?.map((f, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Áreas de mejora</h3>
                  <ul className="space-y-1.5">
                    {ev.areas_mejora?.map((a, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 shrink-0">→</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Habilidades detectadas</h3>
                <div className="flex flex-wrap gap-2">
                  {ev.habilidades_detectadas?.map((h, i) => (
                    <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">{h}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Experiencia</p>
                  <p className="text-lg font-bold text-gray-800">{ev.experiencia_anos} años</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Último cargo</p>
                  <p className="text-xs font-medium text-gray-800 leading-tight">{ev.ultimo_cargo}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Educación</p>
                  <p className="text-xs font-medium text-gray-800 capitalize">{ev.nivel_educativo}</p>
                </div>
              </div>
            </>
          )}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Actualizar estado manualmente</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { estado: 'preseleccionado', label: '✓ Preseleccionar', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                { estado: 'descartado', label: '✗ Descartar', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
                { estado: 'banco_talentos', label: '★ Banco de talentos', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
              ].map(({ estado, label, color }) => (
                <button
                  key={estado}
                  onClick={() => actualizarEstado(estado)}
                  disabled={actualizando || candidato.estado === estado}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${color}`}
                >
                  {label}
                </button>
              ))}
              {candidato.cv_nombre_archivo && (
                <button onClick={verCV}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors">
                  📄 Ver CV
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}