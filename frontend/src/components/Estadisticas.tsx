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

const COLORES = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

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

  // Datos para gráfica de scores por vacante
  const vacantesUnicas = [...new Set(candidatos.map(c => (c.vacantes as any)?.titulo).filter(Boolean))]
  const datosPorVacante = vacantesUnicas.map(titulo => {
    const candidatosVacante = candidatos.filter(c => (c.vacantes as any)?.titulo === titulo)
    const scores = candidatosVacante
      .map(c => c.evaluaciones?.[0]?.score_total)
      .filter((s): s is number => s !== undefined && s !== null)
    const promedio = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + Number(b), 0) / scores.length * 10) / 10
      : 0
    return {
      nombre: titulo.length > 20 ? titulo.substring(0, 20) + '...' : titulo,
      promedio,
      total: candidatosVacante.length
    }
  })

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
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
        No hay datos suficientes para mostrar estadísticas.
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Score promedio', value: `${scorePromedio}/100`, color: 'text-indigo-600' },
          { label: 'Tasa preselección', value: `${tasaPreseleccion}%`, color: 'text-green-600' },
          { label: 'Con análisis IA', value: candidatosConEval.length, color: 'text-purple-600' },
          { label: 'Sin analizar', value: candidatos.filter(c => !c.evaluaciones?.length).length, color: 'text-amber-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Fila 1: Estados y Recomendaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Estados de candidatos */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Candidatos por estado</h3>
          {datosEstados.length > 0 ? (
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
                  {datosEstados.map((_, index) => (
                    <Cell key={index} fill={COLORES[index % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Candidatos']} />
                <Legend
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sin datos
            </div>
          )}
        </div>

        {/* Recomendaciones IA */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recomendaciones de la IA</h3>
          {datosRecomendacion.length > 0 ? (
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
                    <Cell
                      key={index}
                      fill={
                        entry.nombre === 'Contratar' ? '#10b981'
                        : entry.nombre === 'Entrevistar' ? '#6366f1'
                        : '#ef4444'
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Candidatos']} />
                <Legend
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Sin análisis IA aún
            </div>
          )}
        </div>
      </div>

      {/* Fila 2: Distribución de scores */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución de scores</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={distribucionScores} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip formatter={(value) => [value, 'Candidatos']} />
            <Bar dataKey="valor" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fila 3: Score promedio por vacante */}
      {datosPorVacante.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Score promedio por vacante</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosPorVacante} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value, name) => [
                  name === 'promedio' ? `${value}/100` : value,
                  name === 'promedio' ? 'Score promedio' : 'Total candidatos'
                ]}
              />
              <Bar dataKey="promedio" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2">Verde: score promedio · Azul claro: total candidatos</p>
        </div>
      )}
    </div>
  )
}