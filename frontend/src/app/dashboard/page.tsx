'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import type { Candidato, Evaluacion } from '@/lib/supabase'

type CandidatoConEvaluacion = Candidato & {
  evaluaciones?: Evaluacion[]
  vacantes?: { titulo: string; departamento: string }
}

// Colores alineados con los badges de estado que ya se usan en el dashboard
const COLOR_ESTADO: Record<string, string> = {
  'Recibido': '#9ca3af',
  'En proceso': '#3b82f6',
  'Analizado': '#a855f7',
  'Preseleccionado': '#10b981',
  'Descartado': '#ef4444',
  'Banco talentos': '#f59e0b',
}

const COLOR_RECOMENDACION: Record<string, string> = {
  'Contratar': '#10b981',
  'Entrevistar': '#f97316',
  'Descartar': '#ef4444',
}

// Escala de rojo → naranja → verde para que la distribución se lea de un vistazo
const COLOR_RANGO_SCORE: Record<string, string> = {
  '0-20': '#ef4444',
  '21-40': '#f97316',
  '41-60': '#f59e0b',
  '61-80': '#84cc16',
  '81-100': '#10b981',
}

function TarjetaVacia({ mensaje }: { mensaje: string }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
      <span className="text-2xl">📊</span>
      {mensaje}
    </div>
  )
}

export default function Estadisticas({
  candidatos
}: {
  candidatos: CandidatoConEvaluacion[]
}) {
  // Datos para gráfica de estados
  const datosEstados = [
    { nombre: 'Recibido', valor: candidatos.filter(c => c.estado === 'recibido').length },
    { nombre: 'En proceso', valor: candidatos.filter(c => c.estado === 'en_proceso').length },
    { nombre: 'Analizado', valor: candidatos.filter(c => c.estado === 'analizado').length },
    { nombre: 'Preseleccionado', valor: candidatos.filter(c => c.estado === 'preseleccionado').length },
    { nombre: 'Descartado', valor: candidatos.filter(c => c.estado === 'descartado').length },
    { nombre: 'Banco talentos', valor: candidatos.filter(c => c.estado === 'banco_talentos').length },
  ].filter(d => d.valor > 0)

  // Datos para gráfica de recomendaciones IA
  const candidatosConEval = candidatos.filter(c => c.evaluaciones && c.evaluaciones.length > 0)
  const datosRecomendacion = [
    { nombre: 'Contratar', valor: candidatosConEval.filter(c => c.evaluaciones?.[0]?.recomendacion === 'contratar').length },
    { nombre: 'Entrevistar', valor: candidatosConEval.filter(c => c.evaluaciones?.[0]?.recomendacion === 'entrevistar').length },
    { nombre: 'Descartar', valor: candidatosConEval.filter(c => c.evaluaciones?.[0]?.recomendacion === 'descartar').length },
  ].filter(d => d.valor > 0)

  // Score promedio y total de candidatos por vacante — se muestran por separado
  // (antes se graficaban juntos en un bar chart 0-100, lo que hacía ilegible
  // el conteo de candidatos al aplastarse contra esa misma escala)
  const vacantesUnicas = [...new Set(candidatos.map(c => (c.vacantes as any)?.titulo).filter(Boolean))]
  const datosPorVacante = vacantesUnicas
    .map(titulo => {
      const candidatosVacante = candidatos.filter(c => (c.vacantes as any)?.titulo === titulo)
      const scores = candidatosVacante
        .map(c => c.evaluaciones?.[0]?.score_total)
        .filter((s): s is number => s !== undefined && s !== null)
      const promedio = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + Number(b), 0) / scores.length * 10) / 10
        : 0
      return {
        nombre: titulo as string,
        nombreCorto: (titulo as string).length > 28 ? (titulo as string).substring(0, 28) + '…' : titulo,
        promedio,
        total: candidatosVacante.length,
        analizados: scores.length,
      }
    })
    .sort((a, b) => b.promedio - a.promedio)

  // Distribución de scores
  const rangos = [
    { nombre: '0-20', min: 0, max: 20 },
    { nombre: '21-40', min: 21, max: 40 },
    { nombre: '41-60', min: 41, max: 60 },
    { nombre: '61-80', min: 61, max: 80 },
    { nombre: '81-100', min: 81, max: 100 },
  ]
  const distribucionScores = rangos.map(r => ({
    nombre: r.nombre,
    valor: candidatosConEval.filter(c => {
      const score = Number(c.evaluaciones?.[0]?.score_total ?? 0)
      return score >= r.min && score <= r.max
    }).length
  }))

  // Score promedio general
  const todosScores = candidatosConEval
    .map(c => Number(c.evaluaciones?.[0]?.score_total ?? 0))
    .filter(s => s > 0)
  const scorePromedio = todosScores.length > 0
    ? Math.round(todosScores.reduce((a, b) => a + b, 0) / todosScores.length * 10) / 10
    : 0

  const tasaPreseleccion = candidatos.length > 0
    ? Math.round((candidatos.filter(c => c.estado === 'preseleccionado').length / candidatos.length) * 100)
    : 0

  if (candidatos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center text-gray-400">
        <span className="text-3xl block mb-2">📊</span>
        Aún no hay candidatos para mostrar estadísticas.
        <p className="text-xs text-gray-300 mt-1">Cuando lleguen las primeras aplicaciones, este panel se llenará solo.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Score promedio', value: `${scorePromedio}`, sufijo: '/100', icon: '🎯', accent: 'border-l-orange-500', color: 'text-orange-600' },
          { label: 'Tasa de preselección', value: `${tasaPreseleccion}`, sufijo: '%', icon: '✅', accent: 'border-l-emerald-500', color: 'text-emerald-600' },
          { label: 'Con análisis IA', value: `${candidatosConEval.length}`, sufijo: ` de ${candidatos.length}`, icon: '🤖', accent: 'border-l-purple-500', color: 'text-purple-600' },
          { label: 'Sin analizar', value: `${candidatos.filter(c => !c.evaluaciones?.length).length}`, sufijo: '', icon: '⏳', accent: 'border-l-amber-500', color: 'text-amber-600' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${kpi.accent} shadow-sm p-5`}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{kpi.label}</p>
              <span className="text-lg">{kpi.icon}</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>
              {kpi.value}<span className="text-sm font-medium text-gray-400">{kpi.sufijo}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Fila 1: Estados y Recomendaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Estados de candidatos */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <h3 className="text-sm font-semibold text-gray-800">Candidatos por estado</h3>
          </div>
          {datosEstados.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={datosEstados}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="valor"
                  >
                    {datosEstados.map((entry, index) => (
                      <Cell key={index} fill={COLOR_ESTADO[entry.nombre] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Candidatos']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-1">
                {datosEstados.map(d => (
                  <span key={d.nombre} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLOR_ESTADO[d.nombre] }} />
                    {d.nombre} <span className="text-gray-400">({d.valor})</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <TarjetaVacia mensaje="Sin datos todavía" />
          )}
        </div>

        {/* Recomendaciones IA */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <h3 className="text-sm font-semibold text-gray-800">Recomendaciones de la IA</h3>
          </div>
          {datosRecomendacion.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={datosRecomendacion}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="valor"
                  >
                    {datosRecomendacion.map((entry, index) => (
                      <Cell key={index} fill={COLOR_RECOMENDACION[entry.nombre] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Candidatos']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-1">
                {datosRecomendacion.map(d => (
                  <span key={d.nombre} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLOR_RECOMENDACION[d.nombre] }} />
                    {d.nombre} <span className="text-gray-400">({d.valor})</span>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <TarjetaVacia mensaje="Sin análisis de IA aún" />
          )}
        </div>
      </div>

      {/* Fila 2: Distribución de scores */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
            <h3 className="text-sm font-semibold text-gray-800">Distribución de scores</h3>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-3 ml-8">Cuántos candidatos cayeron en cada rango de puntaje (0 a 100)</p>
        {candidatosConEval.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={distribucionScores} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip formatter={(value) => [value, 'Candidatos']} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {distribucionScores.map((entry, index) => (
                  <Cell key={index} fill={COLOR_RANGO_SCORE[entry.nombre]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <TarjetaVacia mensaje="Sin análisis de IA aún" />
        )}
      </div>

      {/* Fila 3: Score promedio por vacante — como lista, no como barras dobles con escalas distintas */}
      {datosPorVacante.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">4</span>
            <h3 className="text-sm font-semibold text-gray-800">Score promedio por vacante</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-8">Ordenadas de mayor a menor puntaje promedio de sus candidatos</p>
          <div className="space-y-4">
            {datosPorVacante.map(v => (
              <div key={v.nombre}>
                <div className="flex items-center justify-between text-sm mb-1 gap-3">
                  <span className="text-gray-700 font-medium truncate" title={v.nombre}>{v.nombreCorto}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                      {v.total} candidato{v.total !== 1 ? 's' : ''}
                    </span>
                    <span className={`text-sm font-bold ${v.promedio >= 80 ? 'text-emerald-600' : v.promedio >= 60 ? 'text-orange-500' : v.promedio > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                      {v.promedio > 0 ? v.promedio.toFixed(1) : '—'}
                      {v.promedio > 0 && <span className="text-gray-400 font-normal">/100</span>}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      v.promedio >= 80 ? 'bg-emerald-500' : v.promedio >= 60 ? 'bg-orange-500' : v.promedio > 0 ? 'bg-red-400' : 'bg-gray-200'
                    }`}
                    style={{ width: `${Math.min(100, v.promedio)}%` }}
                  />
                </div>
                {v.analizados < v.total && (
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {v.total - v.analizados} candidato{v.total - v.analizados !== 1 ? 's' : ''} aún sin analizar
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
