'use client'
import { useState } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function EliminarDatos() {
  const [email, setEmail] = useState('')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API_URL}/api/candidatos/eliminar-datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motivo }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'No pudimos procesar tu solicitud. Intenta de nuevo.')
      }
      setEnviado(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error. Por favor intenta de nuevo.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-orange-600/20 blur-3xl" />
        <div className="max-w-md w-full text-center relative z-10">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-5 rotate-3">
            <svg className="w-8 h-8 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Solicitud recibida</h2>
          <p className="text-gray-400 mb-8">
            Hemos registrado tu solicitud de eliminación de datos. Verificaremos tu
            identidad y eliminaremos tu información en un plazo máximo de 10 días
            hábiles, según lo establecido en la Ley 1581 de 2012.
          </p>
          <Link
            href="/"
            className="inline-block text-orange-400 hover:text-orange-300 text-sm font-medium border border-orange-500/40 hover:border-orange-400 rounded-lg px-5 py-2.5 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-950 relative overflow-hidden">
        <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="max-w-2xl mx-auto px-4 pt-12 pb-16 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-gray-950 text-xs font-bold">
              USB
            </div>
            <div className="leading-tight">
              <p className="text-white text-sm font-semibold">Universidad de San Buenaventura</p>
              <p className="text-orange-400 text-xs">Bogotá D.C. · Talento Humano</p>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Eliminar mis datos personales
          </h1>
          <p className="text-gray-400 mt-3 max-w-lg text-sm leading-relaxed">
            Ejerce tu derecho al olvido. Al confirmar, eliminaremos tu hoja de vida,
            resultados de evaluación y datos de contacto de nuestro sistema de selección.
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-8 pb-16 relative z-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-800">
              Esta acción es <span className="font-semibold">irreversible</span>. Una vez
              eliminados, no podremos recuperar tus datos ni el estado de tu aplicación.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Correo electrónico con el que aplicaste *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Motivo <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Cuéntanos por qué solicitas la eliminación de tus datos..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-950 hover:bg-black disabled:bg-gray-400 text-orange-400 font-semibold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enviando solicitud...
              </>
            ) : 'Solicitar eliminación de mis datos'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Cambiaste de opinión?{' '}
          <Link href="/" className="text-orange-600 hover:underline font-medium">Volver al formulario</Link>
          {' '}·{' '}
          <Link href="/privacidad" className="text-orange-600 hover:underline font-medium">Ver política de privacidad</Link>
        </p>
      </div>
    </div>
  )
}
