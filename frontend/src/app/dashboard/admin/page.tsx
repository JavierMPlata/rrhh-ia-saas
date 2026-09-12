'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type RegistroAuditoria = {
  id: string
  created_at: string
  usuario_email?: string | null
  accion: string
  tabla_afectada?: string | null
  registro_id?: string | null
  detalles?: Record<string, unknown> | null
}

const ACCIONES_ETIQUETA: Record<string, string> = {
  acceso_dashboard: 'Acceso al panel',
  cierre_sesion: 'Cierre de sesión',
  crear_vacante: 'Creó vacante',
  editar_vacante: 'Editó vacante',
  cambio_estado_vacante: 'Cambió estado de vacante',
  cambio_estado_candidato: 'Cambió estado de candidato',
  agregar_nota_candidato: 'Agregó nota a candidato',
  ver_cv: 'Vio hoja de vida',
}

const ACCIONES_COLOR: Record<string, string> = {
  acceso_dashboard: 'bg-blue-100 text-blue-700',
  cierre_sesion: 'bg-gray-100 text-gray-600',
  crear_vacante: 'bg-emerald-100 text-emerald-700',
  editar_vacante: 'bg-orange-100 text-orange-700',
  cambio_estado_vacante: 'bg-amber-100 text-amber-700',
  cambio_estado_candidato: 'bg-amber-100 text-amber-700',
  agregar_nota_candidato: 'bg-purple-100 text-purple-700',
  ver_cv: 'bg-blue-100 text-blue-700',
}

function etiquetaAccion(accion: string) {
  return ACCIONES_ETIQUETA[accion] || accion.replaceAll('_', ' ')
}

function colorAccion(accion: string) {
  return ACCIONES_COLOR[accion] || 'bg-gray-100 text-gray-600'
}

export default function AdminAuditoriaPage() {
  const router = useRouter()
  const supabase = createClient()

  const [pestana, setPestana] = useState<'auditoria'>('auditoria')
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('todas')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [registroExpandido, setRegistroExpandido] = useState<string | null>(null)

  const cargarAuditoria = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('auditoria')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)

    if (fechaDesde) query = query.gte('created_at', fechaDesde)
    if (fechaHasta) query = query.lte('created_at', `${fechaHasta}T23:59:59`)

    const { data, error } = await query
    if (!error && data) setRegistros(data as RegistroAuditoria[])
    setLoading(false)
  }, [fechaDesde, fechaHasta])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUserEmail(user.email || '')
        cargarAuditoria()
      }
    })
  }, [])

  useEffect(() => {
    if (userEmail) cargarAuditoria()
  }, [fechaDesde, fechaHasta])

  const accionesDisponibles = Array.from(new Set(registros.map(r => r.accion)))

  const registrosFiltrados = registros.filter(r => {
    const matchAccion = filtroAccion === 'todas' || r.accion === filtroAccion
    const texto = busqueda.toLowerCase()
    const matchBusqueda = !busqueda ||
      r.usuario_email?.toLowerCase().includes(texto) ||
      r.accion.toLowerCase().includes(texto) ||
      r.tabla_afectada?.toLowerCase().includes(texto) ||
      JSON.stringify(r.detalles || {}).toLowerCase().includes(texto)
    return matchAccion && matchBusqueda
  })

  const hoy = new Date().toDateString()
  const stats = {
    total: registros.length,
    hoy: registros.filter(r => new Date(r.created_at).toDateString() === hoy).length,
    usuarios: new Set(registros.map(r => r.usuario_email).filter(Boolean)).size,
  }

  const hayFiltrosActivos = busqueda !== '' || filtroAccion !== 'todas' || fechaDesde !== '' || fechaHasta !== ''

  const limpiarFiltros = () => {
    setBusqueda('')
    setFiltroAccion('todas')
    setFechaDesde('')
    setFechaHasta('')
  }

  return (
    <div className="min-h-screen bg-orange-50/40">
      <nav className="bg-gray-950 border-b border-gray-800 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-gray-950 text-xs font-bold tracking-tight">
            USB
          </div>
          <div className="leading-tight">
            <span className="font-semibold text-white block">Administración</span>
            <span className="text-[11px] text-orange-400/80 block">Auditoría del sistema</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 hidden sm:block">{userEmail}</span>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-white border border-gray-700 hover:border-orange-400 hover:text-orange-400 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            ← Volver al panel
          </button>
          <button
            onClick={cargarAuditoria}
            className="text-sm text-orange-400 hover:text-orange-300 font-medium"
          >
            Actualizar
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-gray-900 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Eventos registrados</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-orange-500 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Eventos hoy</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.hoy}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 border-l-4 border-l-emerald-500 p-5 shadow-sm">
            <p className="text-sm text-gray-500">Usuarios distintos</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.usuarios}</p>
          </div>
        </div>

        <div className="flex gap-1 mb-4 bg-white border border-gray-200 p-1 rounded-xl w-fit shadow-sm">
          <button
            onClick={() => setPestana('auditoria')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-950 text-orange-400 shadow-sm"
          >
            Auditoría ({registros.length})
          </button>
        </div>

        {pestana === 'auditoria' && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3 space-y-3 shadow-sm">
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Buscar por usuario, acción, tabla o detalle..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  className="flex-1 min-w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm
                             text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
                <select
                  value={filtroAccion}
                  onChange={e => setFiltroAccion(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900
                             bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="todas">Todas las acciones</option>
                  {accionesDisponibles.map(a => (
                    <option key={a} value={a}>{etiquetaAccion(a)}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900
                             bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900
                             bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {hayFiltrosActivos && (
                  <button
                    onClick={limpiarFiltros}
                    className="px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
              {hayFiltrosActivos && (
                <div className="text-xs text-gray-500">
                  Mostrando <span className="font-semibold text-orange-600">{registrosFiltrados.length}</span> de {registros.length} eventos
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-3" />
                  Cargando auditoría...
                </div>
              ) : registrosFiltrados.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <p className="mb-2">No hay eventos con los filtros aplicados.</p>
                  {hayFiltrosActivos && (
                    <button onClick={limpiarFiltros} className="text-orange-600 text-sm hover:underline">
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-950 border-b border-gray-800">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-300">Fecha</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-300">Usuario</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-300">Acción</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-300">Tabla</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-300">Detalles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {registrosFiltrados.map(r => (
                        <tr key={r.id} className="hover:bg-orange-50/60 transition-colors align-top">
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString('es-CO', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-xs">
                            {r.usuario_email || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${colorAccion(r.accion)}`}>
                              {etiquetaAccion(r.accion)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {r.tabla_afectada || '—'}
                            {r.registro_id && (
                              <div className="text-gray-300 text-[10px] mt-0.5 truncate max-w-[120px]" title={r.registro_id}>
                                {r.registro_id}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {r.detalles && Object.keys(r.detalles).length > 0 ? (
                              <button
                                onClick={() => setRegistroExpandido(registroExpandido === r.id ? null : r.id)}
                                className="text-orange-600 hover:text-orange-800 font-medium"
                              >
                                {registroExpandido === r.id ? 'Ocultar' : 'Ver detalle'}
                              </button>
                            ) : '—'}
                            {registroExpandido === r.id && r.detalles && (
                              <pre className="mt-2 bg-gray-50 rounded-lg p-2 text-[11px] text-gray-600 max-w-xs overflow-x-auto">
                                {JSON.stringify(r.detalles, null, 2)}
                              </pre>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
