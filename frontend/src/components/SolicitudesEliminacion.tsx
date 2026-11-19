'use client'
import { useState, useEffect, useCallback } from 'react'

type Postulacion = { nombre: string; telefono: string | null; created_at: string }

export type SolicitudEliminacion = {
  id: string
  email: string
  motivo: string | null
  estado: 'pendiente' | 'completada' | 'rechazada'
  created_at: string
  resuelta_en: string | null
  resuelta_por_email: string | null
  candidatos_eliminados: number | null
  nota_resolucion: string | null
  postulaciones?: Postulacion[]
}

const ESTADO_COLOR: Record<SolicitudEliminacion['estado'], string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  completada: 'bg-emerald-100 text-emerald-700',
  rechazada: 'bg-gray-100 text-gray-600',
}

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

export default function SolicitudesEliminacion({
  onCambioPendientes,
}: {
  onCambioPendientes?: (n: number) => void
}) {
  const [solicitudes, setSolicitudes] = useState<SolicitudEliminacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/eliminar-datos/solicitudes', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las solicitudes')
      const lista: SolicitudEliminacion[] = data.solicitudes
      setSolicitudes(lista)
      onCambioPendientes?.(lista.filter(s => s.estado === 'pendiente').length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [onCambioPendientes])

  useEffect(() => { cargar() }, [cargar])

  const resolver = async (s: SolicitudEliminacion, accion: 'ejecutar' | 'rechazar') => {
    const n = s.postulaciones?.length ?? 0
    const mensaje = accion === 'ejecutar'
      ? `Se eliminarán de forma permanente ${n} postulación(es), sus hojas de vida y evaluaciones asociadas a ${s.email}.\n\nEsta acción no se puede deshacer. ¿Confirmas que verificaste la identidad del titular?`
      : `¿Rechazar la solicitud de ${s.email}? Los datos no se eliminarán.`
    if (!window.confirm(mensaje)) return

    const nota = window.prompt('Nota de resolución (opcional, p. ej. cómo se verificó la identidad):') ?? ''

    setProcesando(s.id)
    try {
      const res = await fetch(`/api/eliminar-datos/solicitudes/${s.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, nota }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la operación')
      await cargar()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setProcesando(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-3" />
        Cargando solicitudes...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
        {error}{' '}
        <button onClick={cargar} className="underline font-medium">Reintentar</button>
      </div>
    )
  }

  if (solicitudes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 shadow-sm">
        No hay solicitudes de eliminación de datos.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Verifica la identidad del titular (p. ej. escribiéndole al correo de la solicitud) antes de ejecutar.
        Plazo legal: 10 días hábiles (Ley 1581 de 2012).
      </p>
      {solicitudes.map(s => (
        <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 break-all">{s.email}</span>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLOR[s.estado]}`}>
                  {s.estado}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Solicitada el {fecha(s.created_at)}</p>
              {s.motivo && <p className="text-sm text-gray-700 mt-2">Motivo: {s.motivo}</p>}
            </div>

            {s.estado === 'pendiente' && (
              <div className="flex gap-2">
                <button
                  onClick={() => resolver(s, 'rechazar')}
                  disabled={procesando === s.id}
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => resolver(s, 'ejecutar')}
                  disabled={procesando === s.id}
                  className="px-3 py-1.5 rounded-lg text-sm bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
                >
                  {procesando === s.id ? 'Procesando...' : 'Eliminar datos'}
                </button>
              </div>
            )}
          </div>

          {s.estado === 'pendiente' && (
            <div className="mt-3 text-xs">
              {s.postulaciones && s.postulaciones.length > 0 ? (
                <ul className="text-gray-600 space-y-0.5">
                  {s.postulaciones.map((p, i) => (
                    <li key={i}>
                      • {p.nombre}{p.telefono ? ` · ${p.telefono}` : ''} · postulado el {fecha(p.created_at)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No hay postulaciones con este correo.</p>
              )}
            </div>
          )}

          {s.estado !== 'pendiente' && (
            <p className="mt-3 text-xs text-gray-500">
              {s.estado === 'completada'
                ? `Eliminadas ${s.candidatos_eliminados ?? 0} postulación(es)`
                : 'Rechazada'}
              {s.resuelta_en && ` el ${fecha(s.resuelta_en)}`}
              {s.resuelta_por_email && ` por ${s.resuelta_por_email}`}
              {s.nota_resolucion && ` · ${s.nota_resolucion}`}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
