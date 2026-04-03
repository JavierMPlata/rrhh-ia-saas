'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { PerfilUsuario, EmpresaConfig, Auditoria } from '@/lib/supabase'

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [pestana, setPestana] = useState<'usuarios' | 'empresa' | 'auditoria'>('usuarios')
  const [perfiles, setPerfiles] = useState<PerfilUsuario[]>([])
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)
  const [auditoria, setAuditoria] = useState<Auditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUsuario, setModalUsuario] = useState(false)
  const [guardandoEmpresa, setGuardandoEmpresa] = useState(false)
  const [empresaGuardada, setEmpresaGuardada] = useState(false)
  const [formEmpresa, setFormEmpresa] = useState<Partial<EmpresaConfig>>({})

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      const { data: perfil } = await supabase
        .from('perfiles_usuario')
        .select('rol')
        .eq('user_id', user.id)
        .single()
      if (!perfil || perfil.rol !== 'admin') {
        router.push('/dashboard')
        return
      }
      cargarDatos()
    })
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const [perfilesRes, empresaRes, auditoriaRes] = await Promise.all([
      supabase.from('perfiles_usuario').select('*').order('created_at', { ascending: false }),
      supabase.from('empresa_config').select('*').single(),
      supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(100)
    ])
    if (perfilesRes.data) setPerfiles(perfilesRes.data as PerfilUsuario[])
    if (empresaRes.data) {
      setEmpresa(empresaRes.data as EmpresaConfig)
      setFormEmpresa(empresaRes.data as EmpresaConfig)
    }
    if (auditoriaRes.data) setAuditoria(auditoriaRes.data as Auditoria[])
    setLoading(false)
  }

  const cambiarRol = async (userId: string, nuevoRol: string) => {
    await supabase.from('perfiles_usuario').update({ rol: nuevoRol }).eq('user_id', userId)
    cargarDatos()
  }

  const toggleActivo = async (userId: string, activo: boolean) => {
    await supabase.from('perfiles_usuario').update({ activo: !activo }).eq('user_id', userId)
    cargarDatos()
  }

  const guardarEmpresa = async () => {
    setGuardandoEmpresa(true)
    if (empresa?.id) {
      await supabase.from('empresa_config').update(formEmpresa).eq('id', empresa.id)
    }
    setGuardandoEmpresa(false)
    setEmpresaGuardada(true)
    setTimeout(() => setEmpresaGuardada(false), 2000)
    cargarDatos()
  }

  const formatearAccion = (accion: string): string => {
    const etiquetas: Record<string, string> = {
      'acceso_dashboard': 'Acceso al sistema',
      'cierre_sesion': 'Cierre de sesión',
      'cambio_estado_candidato': 'Cambio de estado',
      'agregar_nota_candidato': 'Nota agregada',
      'ver_cv': 'CV consultado',
      'editar_vacante': 'Vacante editada',
      'crear_vacante': 'Vacante creada',
      'cambio_estado_vacante': 'Estado de vacante',
    }
    return etiquetas[accion] || accion
  }

  const formatearDetalle = (accion: string, detalle: any): string => {
    if (!detalle) return '—'
    switch (accion) {
      case 'cambio_estado_candidato':
        return `${detalle.candidato}: ${detalle.estado_anterior} → ${detalle.estado_nuevo}`
      case 'agregar_nota_candidato':
        return `Nota agregada en perfil de ${detalle.candidato}`
      case 'ver_cv':
        return `CV de ${detalle.candidato} fue consultado`
      case 'editar_vacante':
        return `Vacante "${detalle.titulo}" fue modificada`
      case 'crear_vacante':
        return `Nueva vacante creada: "${detalle.titulo}"`
      case 'cambio_estado_vacante':
        return `Vacante cambió su estado a: ${detalle.estado_nuevo}`
      case 'acceso_dashboard':
        return 'Ingresó al panel RRHH'
      case 'cierre_sesion':
        return 'Cerró sesión del sistema'
      default:
        return JSON.stringify(detalle)
    }
  }

  const accionColor = (accion: string): string => {
    if (accion.includes('crear')) return 'bg-green-100 text-green-700'
    if (accion.includes('editar')) return 'bg-blue-100 text-blue-700'
    if (accion.includes('eliminar')) return 'bg-red-100 text-red-700'
    if (accion.includes('cambio')) return 'bg-amber-100 text-amber-700'
    if (accion.includes('acceso')) return 'bg-gray-100 text-gray-600'
    if (accion.includes('cierre')) return 'bg-red-50 text-red-500'
    if (accion.includes('nota')) return 'bg-purple-100 text-purple-700'
    if (accion.includes('cv')) return 'bg-teal-100 text-teal-700'
    return 'bg-indigo-100 text-indigo-700'
  }

  const ROL_COLOR: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    rrhh_senior: 'bg-blue-100 text-blue-700',
    rrhh_junior: 'bg-gray-100 text-gray-700',
  }

  const ROL_ETIQUETA: Record<string, string> = {
    admin: 'Administrador',
    rrhh_senior: 'RRHH Senior',
    rrhh_junior: 'RRHH Junior',
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
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1"
        >
          ← Volver
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-semibold text-gray-900 text-sm">Administración</span>
        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
          Admin
        </span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { id: 'usuarios', label: `Usuarios (${perfiles.length})` },
            { id: 'empresa', label: 'Perfil de empresa' },
            { id: 'auditoria', label: `Auditoría (${auditoria.length})` },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPestana(p.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${pestana === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Pestaña Usuarios */}
        {pestana === 'usuarios' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-800">Usuarios del sistema</h2>
              <button
                onClick={() => setModalUsuario(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                + Invitar usuario
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Desde</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {perfiles.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.nombre_completo}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ROL_COLOR[p.rol]}`}>
                          {ROL_ETIQUETA[p.rol]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${p.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(p.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <select
                            value={p.rol}
                            onChange={e => cambiarRol(p.user_id, e.target.value)}
                            className="px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-900 bg-white"
                          >
                            <option value="admin">Admin</option>
                            <option value="rrhh_senior">RRHH Senior</option>
                            <option value="rrhh_junior">RRHH Junior</option>
                          </select>
                          <button
                            onClick={() => toggleActivo(p.user_id, p.activo)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors
                              ${p.activo
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                          >
                            {p.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pestaña Empresa */}
        {pestana === 'empresa' && formEmpresa && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-800">Perfil de la empresa</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la empresa *</label>
                <input
                  value={formEmpresa.nombre || ''}
                  onChange={e => setFormEmpresa(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">NIT</label>
                <input
                  value={formEmpresa.nit || ''}
                  onChange={e => setFormEmpresa(p => ({ ...p, nit: e.target.value }))}
                  placeholder="900.123.456-7"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sector</label>
                <input
                  value={formEmpresa.sector || ''}
                  onChange={e => setFormEmpresa(p => ({ ...p, sector: e.target.value }))}
                  placeholder="Tecnología, Salud, Finanzas..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad</label>
                <input
                  value={formEmpresa.ciudad || ''}
                  onChange={e => setFormEmpresa(p => ({ ...p, ciudad: e.target.value }))}
                  placeholder="Bogotá"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                <input
                  value={formEmpresa.telefono || ''}
                  onChange={e => setFormEmpresa(p => ({ ...p, telefono: e.target.value }))}
                  placeholder="+57 1 234 5678"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email de contacto</label>
                <input
                  value={formEmpresa.email_contacto || ''}
                  onChange={e => setFormEmpresa(p => ({ ...p, email_contacto: e.target.value }))}
                  placeholder="contacto@empresa.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sitio web</label>
                <input
                  value={formEmpresa.website || ''}
                  onChange={e => setFormEmpresa(p => ({ ...p, website: e.target.value }))}
                  placeholder="https://www.empresa.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Color primario</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formEmpresa.color_primario || '#6366f1'}
                    onChange={e => setFormEmpresa(p => ({ ...p, color_primario: e.target.value }))}
                    className="h-10 w-16 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <input
                    value={formEmpresa.color_primario || '#6366f1'}
                    onChange={e => setFormEmpresa(p => ({ ...p, color_primario: e.target.value }))}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción de la empresa</label>
              <textarea
                value={formEmpresa.descripcion || ''}
                onChange={e => setFormEmpresa(p => ({ ...p, descripcion: e.target.value }))}
                rows={3}
                placeholder="Describe tu empresa, misión y valores..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dirección</label>
              <input
                value={formEmpresa.direccion || ''}
                onChange={e => setFormEmpresa(p => ({ ...p, direccion: e.target.value }))}
                placeholder="Calle 123 # 45-67, Bogotá"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={guardarEmpresa}
              disabled={guardandoEmpresa}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
                         text-white rounded-lg text-sm font-medium transition-colors"
            >
              {empresaGuardada ? '✓ Guardado' : guardandoEmpresa ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}

        {/* Pestaña Auditoría */}
        {pestana === 'auditoria' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-semibold text-gray-800">Historial de actividad</h2>
              <span className="text-xs text-gray-400">Últimos 100 registros</span>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {auditoria.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  No hay registros de auditoría aún.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Acción</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Detalle</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Fecha y hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {auditoria.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-gray-700 text-xs font-medium">{a.user_email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                              ${accionColor(a.accion)}`}>
                              {formatearAccion(a.accion)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs max-w-sm">
                            {formatearDetalle(a.accion, a.detalle)}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(a.created_at).toLocaleString('es-CO', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modalUsuario && (
        <ModalInvitarUsuario
          onClose={() => setModalUsuario(false)}
          onInvitado={() => { setModalUsuario(false); cargarDatos() }}
        />
      )}
    </div>
  )
}

function ModalInvitarUsuario({
  onClose,
  onInvitado
}: {
  onClose: () => void
  onInvitado: () => void
}) {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('rrhh_junior')
  const [password, setPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const res = await fetch('/api/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nombre, rol })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear usuario')
      setExito(true)
      setTimeout(onInvitado, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Crear nuevo usuario RRHH</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={handleInvitar} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
            <input required value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="María García"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="maria@empresa.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña temporal</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
            <select value={rol} onChange={e => setRol(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="rrhh_junior">RRHH Junior</option>
              <option value="rrhh_senior">RRHH Senior</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}
          {exito && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
              ✓ Usuario creado exitosamente
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium">
              {guardando ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}