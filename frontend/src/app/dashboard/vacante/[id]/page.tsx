'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Candidato, Evaluacion, Vacante } from '@/lib/supabase'

type CandidatoConEvaluacion = Candidato & {
  evaluaciones?: Evaluacion[]
}

export default function DetalleVacantePage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const id = params.id as string

  const [vacante, setVacante] = useState<Vacante | null>(null)
  const [candidatos, setCandidatos] = useState<CandidatoConEvaluacion[]>([])
  const [candidatosComparar, setCandidatosComparar] = useState<CandidatoConEvaluacion[]>([])
  const [loading, setLoading] = useState(true)
  const [modalComparar, setModalComparar] = useState(false)
  const [modalEvaluar, setModalEvaluar] = useState<CandidatoConEvaluacion | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      cargarDatos()
    })
  }, [id])

  const cargarDatos = async () => {
    setLoading(true)

    const [vacanteRes, candidatosRes] = await Promise.all([
      supabase.from('vacantes').select('*').eq('id', id).single(),
      supabase.from('candidatos')
        .select('*, evaluaciones(*)')
        .eq('vacante_id', id)
        .order('created_at', { ascending: false })
    ])

    if (vacanteRes.data) setVacante(vacanteRes.data as Vacante)
    if (candidatosRes.data) setCandidatos(candidatosRes.data as CandidatoConEvaluacion[])
    setLoading(false)
  }

  const toggleComparar = (candidato: CandidatoConEvaluacion) => {
    setCandidatosComparar(prev => {
      const existe = prev.find(c => c.id === candidato.id)
      if (existe) return prev.filter(c => c.id !== candidato.id)
      if (prev.length >= 3) return prev
      return [...prev, candidato]
    })
  }

  const estadoColor: Record<string, string> = {
    activa: 'bg-green-100 text-green-700',
    pausada: 'bg-amber-100 text-amber-700',
    cerrada: 'bg-red-100 text-red-700',
  }

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-500'

  const recomColor: Record<string, string> = {
    contratar: 'bg-green-100 text-green-700',
    entrevistar: 'bg-blue-100 text-blue-700',
    descartar: 'bg-red-100 text-red-700',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full"/>
      </div>
    )
  }

  if (!vacante) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Vacante no encontrada</p>
          <button onClick={() => router.push('/dashboard')}
            className="text-indigo-600 hover:underline text-sm">
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  const preseleccionados = candidatos.filter(c => c.estado === 'preseleccionado').length
  const scorePromedio = candidatos.length > 0
    ? Math.round(candidatos.reduce((acc, c) =>
        acc + Number(c.evaluaciones?.[0]?.score_total ?? 0), 0
      ) / candidatos.length * 10) / 10
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-500 hover:text-gray-900 text-sm flex items-center gap-1"
        >
          ← Volver
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-semibold text-gray-900 text-sm">{vacante.titulo}</span>
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${estadoColor[vacante.estado]}`}>
          {vacante.estado}
        </span>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Info de la vacante */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{vacante.titulo}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {vacante.departamento && `${vacante.departamento} · `}
                {vacante.modalidad} · {vacante.experiencia_minima} años exp. mín · {vacante.educacion_requerida}
              </p>
              {vacante.salario_min && vacante.salario_max && (
                <p className="text-gray-500 text-sm">
                  ${vacante.salario_min.toLocaleString()} - ${vacante.salario_max.toLocaleString()} COP
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{candidatos.length}</p>
                <p className="text-xs text-gray-500">Candidatos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{preseleccionados}</p>
                <p className="text-xs text-gray-500">Preseleccionados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-600">{scorePromedio}</p>
                <p className="text-xs text-gray-500">Score prom.</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">{vacante.descripcion}</p>

          <div className="flex flex-wrap gap-2">
            {vacante.habilidades_requeridas?.map((h, i) => (
              <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                {h}
              </span>
            ))}
          </div>
        </div>

        {/* Barra de acciones */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            Candidatos ({candidatos.length})
          </h2>
          <div className="flex gap-3">
            {candidatosComparar.length >= 2 && (
              <button
                onClick={() => setModalComparar(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Comparar {candidatosComparar.length} candidatos
              </button>
            )}
            {candidatosComparar.length > 0 && (
              <button
                onClick={() => setCandidatosComparar([])}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>

        {candidatosComparar.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-700">
            Seleccionados para comparar: {candidatosComparar.map(c => c.nombre_completo).join(', ')}
            {candidatosComparar.length < 2 && ' — Selecciona al menos 2'}
          </div>
        )}

        {/* Tabla de candidatos */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {candidatos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No hay candidatos para esta vacante aún.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">
                    <input type="checkbox" className="opacity-0"/>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Candidato</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Score IA</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Habilidades</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Exp.</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">IA dice</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {candidatos
                  .sort((a, b) =>
                    Number(b.evaluaciones?.[0]?.score_total ?? 0) -
                    Number(a.evaluaciones?.[0]?.score_total ?? 0)
                  )
                  .map(c => {
                    const ev = c.evaluaciones?.[0]
                    const score = ev?.score_total ?? null
                    const seleccionado = candidatosComparar.find(x => x.id === c.id)
                    return (
                      <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${seleccionado ? 'bg-indigo-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!seleccionado}
                            onChange={() => toggleComparar(c)}
                            className="rounded border-gray-300 text-indigo-600"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{c.nombre_completo}</div>
                          <div className="text-gray-400 text-xs">{c.email}</div>
                          {ev?.ultimo_cargo && (
                            <div className="text-gray-400 text-xs">{ev.ultimo_cargo}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium`}>
                            {c.estado}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-center font-bold text-lg ${score !== null ? scoreColor(Number(score)) : 'text-gray-400'}`}>
                          {score !== null ? Number(score).toFixed(1) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-600">
                          {ev?.habilidades_detectadas?.length ?? 0}/{vacante.habilidades_requeridas?.length ?? 0}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-gray-600">
                          {ev?.experiencia_anos ?? '—'} años
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ev?.recomendacion ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${recomColor[ev.recomendacion] || 'bg-gray-100 text-gray-500'}`}>
                              {ev.recomendacion}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setModalEvaluar(c)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium
                                       bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Evaluar
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Comparar */}
      {modalComparar && candidatosComparar.length >= 2 && (
        <ModalComparar
          candidatos={candidatosComparar}
          vacante={vacante}
          onClose={() => setModalComparar(false)}
        />
      )}

      {/* Modal Evaluar */}
      {modalEvaluar && (
        <ModalEvaluarManual
          candidato={modalEvaluar}
          vacante={vacante}
          onClose={() => setModalEvaluar(null)}
          onGuardado={cargarDatos}
        />
      )}
    </div>
  )
}

function ModalComparar({
  candidatos,
  vacante,
  onClose
}: {
  candidatos: CandidatoConEvaluacion[]
  vacante: Vacante
  onClose: () => void
}) {
  const habilidadesRequeridas = vacante.habilidades_requeridas || []

  const ScoreBar = ({ value, color }: { value: number; color: string }) => (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }}/>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Comparar candidatos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6">
          <div className={`grid gap-4 ${candidatos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {candidatos.map(c => {
              const ev = c.evaluaciones?.[0]
              const score = Number(ev?.score_total ?? 0)
              const habilidadesMatch = (ev?.habilidades_detectadas || []).filter(h =>
                habilidadesRequeridas.some(r =>
                  r.toLowerCase().includes(h.toLowerCase()) ||
                  h.toLowerCase().includes(r.toLowerCase())
                )
              )

              return (
                <div key={c.id} className="border border-gray-200 rounded-xl p-5 space-y-4">
                  {/* Header */}
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.nombre_completo}</h3>
                    <p className="text-xs text-gray-500">{c.email}</p>
                    {ev?.ultimo_cargo && (
                      <p className="text-xs text-gray-500 mt-0.5">{ev.ultimo_cargo} en {ev.ultima_empresa}</p>
                    )}
                  </div>

                  {/* Score total */}
                  <div className="text-center py-3 bg-gray-50 rounded-lg">
                    <p className={`text-4xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {score.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-500">Score total /100</p>
                    {ev?.recomendacion && (
                      <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${ev.recomendacion === 'contratar' ? 'bg-green-100 text-green-700'
                          : ev.recomendacion === 'entrevistar' ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'}`}>
                        {ev.recomendacion}
                      </span>
                    )}
                  </div>

                  {/* Scores detallados */}
                  {ev && (
                    <div className="space-y-2">
                      {[
                        { label: 'Habilidades (40%)', value: Number(ev.score_habilidades), color: 'bg-blue-500' },
                        { label: 'Experiencia (30%)', value: Number(ev.score_experiencia), color: 'bg-teal-500' },
                        { label: 'Educación (20%)', value: Number(ev.score_educacion), color: 'bg-purple-500' },
                        { label: 'Fit cultural (10%)', value: Number(ev.score_fit_cultural), color: 'bg-amber-400' },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{item.label}</span>
                            <span className="font-medium">{item.value.toFixed(0)}</span>
                          </div>
                          <ScoreBar value={item.value} color={item.color} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info rápida */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Experiencia</p>
                      <p className="text-sm font-bold text-gray-800">{ev?.experiencia_anos ?? '—'} años</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <p className="text-xs text-gray-500">Educación</p>
                      <p className="text-xs font-medium text-gray-800 capitalize">{ev?.nivel_educativo || '—'}</p>
                    </div>
                  </div>

                  {/* Habilidades que coinciden */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      Habilidades requeridas ({habilidadesMatch.length}/{habilidadesRequeridas.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {habilidadesRequeridas.map((h, i) => {
                        const tiene = (ev?.habilidades_detectadas || []).some(d =>
                          d.toLowerCase().includes(h.toLowerCase()) ||
                          h.toLowerCase().includes(d.toLowerCase())
                        )
                        return (
                          <span key={i} className={`px-2 py-0.5 rounded-full text-xs
                            ${tiene ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                            {tiene ? '✓' : '✗'} {h}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Fortalezas */}
                  {ev?.fortalezas && ev.fortalezas.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Fortalezas</p>
                      <ul className="space-y-0.5">
                        {ev.fortalezas.slice(0, 3).map((f, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-green-500 shrink-0">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalEvaluarManual({
  candidato,
  vacante,
  onClose,
  onGuardado
}: {
  candidato: CandidatoConEvaluacion
  vacante: Vacante
  onClose: () => void
  onGuardado: () => void
}) {
  const supabase = createClient()
  const [guardando, setGuardando] = useState(false)
  const [evaluacion, setEvaluacion] = useState({
    puntualidad: 0,
    comunicacion: 0,
    conocimiento_tecnico: 0,
    actitud: 0,
    experiencia_practica: 0,
    notas_entrevista: '',
    decision: 'pendiente'
  })

  const promedioManual = evaluacion.puntualidad || evaluacion.comunicacion
    ? Math.round((
        evaluacion.puntualidad +
        evaluacion.comunicacion +
        evaluacion.conocimiento_tecnico +
        evaluacion.actitud +
        evaluacion.experiencia_practica
      ) / 5 * 10) / 10
    : 0

  const handleGuardar = async () => {
    setGuardando(true)

    // Guardar notas con la evaluación manual
    const notaEval = `
=== EVALUACIÓN MANUAL RRHH ===
Fecha: ${new Date().toLocaleDateString('es-CO')}
Puntualidad: ${evaluacion.puntualidad}/10
Comunicación: ${evaluacion.comunicacion}/10
Conocimiento técnico: ${evaluacion.conocimiento_tecnico}/10
Actitud: ${evaluacion.actitud}/10
Experiencia práctica: ${evaluacion.experiencia_practica}/10
Promedio manual: ${promedioManual}/10
Decisión: ${evaluacion.decision}
Notas: ${evaluacion.notas_entrevista}
=========================
    `.trim()

    const notasExistentes = candidato.notas || ''
    const notasActualizadas = notasExistentes
      ? `${notasExistentes}\n\n${notaEval}`
      : notaEval

    // Actualizar estado según decisión
    const nuevoEstado = evaluacion.decision === 'aprobar'
      ? 'preseleccionado'
      : evaluacion.decision === 'rechazar'
      ? 'descartado'
      : candidato.estado

    await supabase.from('candidatos').update({
      notas: notasActualizadas,
      estado: nuevoEstado
    }).eq('id', candidato.id)

    setGuardando(false)
    onGuardado()
    onClose()
  }

  const Slider = ({
    label, field, value
  }: {
    label: string
    field: keyof typeof evaluacion
    value: number
  }) => (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <label className="text-gray-700 font-medium">{label}</label>
        <span className={`font-bold ${value >= 7 ? 'text-green-600' : value >= 5 ? 'text-amber-500' : value > 0 ? 'text-red-500' : 'text-gray-400'}`}>
          {value > 0 ? `${value}/10` : 'Sin calificar'}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={value}
        onChange={e => setEvaluacion(prev => ({ ...prev, [field]: parseFloat(e.target.value) }))}
        className="w-full accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Evaluación manual</h2>
            <p className="text-sm text-gray-500">{candidato.nombre_completo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Score promedio manual */}
          {promedioManual > 0 && (
            <div className="text-center bg-indigo-50 rounded-xl py-4">
              <p className={`text-4xl font-bold ${promedioManual >= 7 ? 'text-green-600' : promedioManual >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
                {promedioManual}
              </p>
              <p className="text-xs text-gray-500 mt-1">Promedio evaluación manual /10</p>
            </div>
          )}

          {/* Sliders de evaluación */}
          <div className="space-y-5">
            <Slider label="Puntualidad" field="puntualidad" value={evaluacion.puntualidad} />
            <Slider label="Comunicación" field="comunicacion" value={evaluacion.comunicacion} />
            <Slider label="Conocimiento técnico" field="conocimiento_tecnico" value={evaluacion.conocimiento_tecnico} />
            <Slider label="Actitud y motivación" field="actitud" value={evaluacion.actitud} />
            <Slider label="Experiencia práctica" field="experiencia_practica" value={evaluacion.experiencia_practica} />
          </div>

          {/* Notas de entrevista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notas de la entrevista
            </label>
            <textarea
              value={evaluacion.notas_entrevista}
              onChange={e => setEvaluacion(prev => ({ ...prev, notas_entrevista: e.target.value }))}
              rows={4}
              placeholder="Observaciones, impresiones, puntos destacados..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900
                         bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Decisión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Decisión final</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'aprobar', label: '✓ Aprobar', color: 'border-green-400 bg-green-50 text-green-700' },
                { value: 'pendiente', label: '⏳ Pendiente', color: 'border-gray-300 bg-gray-50 text-gray-700' },
                { value: 'rechazar', label: '✗ Rechazar', color: 'border-red-400 bg-red-50 text-red-700' },
              ].map(op => (
                <button
                  key={op.value}
                  onClick={() => setEvaluacion(prev => ({ ...prev, decision: op.value }))}
                  className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-colors
                    ${evaluacion.decision === op.value ? op.color : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400
                         text-white rounded-lg text-sm font-medium transition-colors"
            >
              {guardando ? 'Guardando...' : 'Guardar evaluación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}