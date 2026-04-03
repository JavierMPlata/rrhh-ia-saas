'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function EliminarDatosPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ ok: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResultado(null)

    try {
      const res = await fetch('/api/eliminar-datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      setResultado({ ok: res.ok, message: data.message || data.error })
    } catch {
      setResultado({ ok: false, message: 'Error de conexión. Intenta nuevamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Solicitud de eliminación de datos</h1>
          <p className="text-gray-500 text-sm mt-2">
            Ejerce tu derecho al olvido conforme a la Ley 1581 de 2012. 
            Ingresa el correo con el que aplicaste y eliminaremos todos tus datos de nuestro sistema.
          </p>
        </div>

        {!resultado ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico con el que aplicaste
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-800 text-xs">
                ⚠️ Esta acción es irreversible. Se eliminarán tu hoja de vida, 
                evaluaciones y todos los datos asociados a tu perfil.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Procesando...' : 'Eliminar mis datos'}
            </button>
          </form>
        ) : (
          <div className={`rounded-xl p-5 text-center space-y-3 ${resultado.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="text-3xl">{resultado.ok ? '✅' : '❌'}</div>
            <p className={`text-sm font-medium ${resultado.ok ? 'text-green-800' : 'text-red-800'}`}>
              {resultado.message}
            </p>
            {!resultado.ok && (
              <button
                onClick={() => setResultado(null)}
                className="text-sm text-gray-500 underline"
              >
                Intentar nuevamente
              </button>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 text-center">
          <Link href="/privacidad" className="text-xs text-indigo-600 hover:underline">
            Ver política de privacidad
          </Link>
        </div>
      </div>
    </div>
  )
}