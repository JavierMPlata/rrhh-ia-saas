'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { Vacante } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TELEFONO_REGEX = /^[0-9+\-\s]{7,15}$/

// Patrones ampliados: path traversal, inyección, URLs, XSS, SQLi, SSI
const PATRONES_PELIGROSOS = [
  '../', '..\\', '/etc/', 'c:\\', 'c:/', 'system.ini', 'win.ini',
  'web-inf', '<', '{%', '{{', '${', '#{',
  // XSS / HTML injection
  'script', 'onerror', 'onload', 'onclick', 'alert(', 'prompt(', 'confirm(',
  'javascript:', 'vbscript:', 'data:text/html',
  // SSI injection
  '<!--#', '#exec', '#include',
  // SQL injection básico
  'union ', ' or ', ' and ', '--', ';--', "'; ", '"; ',
  // Open redirect / SSRF
  'http://', 'https://', 'www.',
  // Null bytes
  '\x00', '%00',
]

function esPeligroso(valor: string): boolean {
  const lower = valor.toLowerCase()
  return PATRONES_PELIGROSOS.some(p => lower.includes(p.toLowerCase()))
}

/**
 * Elimina TODOS los query params al montar.
 *
 * El formulario público es una SPA que no consume ningún parámetro de URL,
 * por lo tanto cualquier query param es innecesario o es un intento de
 * reflected parameter injection / XSS reflejado.
 *
 * Esto es consistente con el comportamiento de /dashboard/page.tsx.
 */
function limpiarURLSospechosa() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)

  if (url.searchParams.toString().length > 0) {
    url.search = ''
    window.history.replaceState({}, '', url.toString())
  }
}

export default function FormularioPublico() {
  const supabase = createClient()
  const [vacantes, setVacantes] = useState<Vacante[]>([])
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaTratamiento, setAceptaTratamiento] = useState(false)

  useEffect(() => {
    // Eliminar TODOS los query params de la URL al cargar
    limpiarURLSospechosa()

    supabase.from('vacantes')
      .select('id, titulo, departamento, modalidad')
      .eq('estado', 'activa')
      .then(({ data }) => {
        if (data) setVacantes(data as Vacante[])
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const nombreCompleto = (form.elements.namedItem('nombre_completo') as HTMLInputElement).value.trim()
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const telefono = (form.elements.namedItem('telefono') as HTMLInputElement).value.trim()
    const ciudad = (form.elements.namedItem('ciudad') as HTMLInputElement).value.trim()
    const vacanteId = (form.elements.namedItem('vacante_id') as HTMLSelectElement).value.trim()

    if (!aceptaTerminos || !aceptaTratamiento) {
      setError('Debes aceptar los términos y el tratamiento de datos personales')
      setLoading(false)
      return
    }

    if (!archivo) {
      setError('Por favor adjunta tu hoja de vida (PDF o Word)')
      setLoading(false)
      return
    }

    // Validar campos de texto contra inyección, path traversal, URLs y XSS
    for (const [campo, valor] of [
      ['Nombre', nombreCompleto],
      ['Ciudad', ciudad],
    ]) {
      if (esPeligroso(valor)) {
        setError(`El campo ${campo} contiene caracteres no permitidos`)
        setLoading(false)
        return
      }
    }

    // Email: validar que no contenga patrones de inyección (aparte del formato)
    if (esPeligroso(email.replace('@', '').replace('.', ''))) {
      setError('El correo electrónico contiene caracteres no permitidos')
      setLoading(false)
      return
    }

    // Teléfono: solo dígitos, +, -, espacios
    if (telefono && !TELEFONO_REGEX.test(telefono)) {
      setError('El teléfono solo puede contener números, espacios, + y -')
      setLoading(false)
      return
    }

    // vacante_id: debe ser UUID válido o vacío
    if (vacanteId && !UUID_REGEX.test(vacanteId)) {
      setError('La vacante seleccionada no es válida')
      setLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('nombre_completo', nombreCompleto)
    formData.append('email', email)
    formData.append('telefono', telefono)
    formData.append('ciudad', ciudad)
    formData.append('vacante_id', vacanteId)
    formData.append('acepta_terminos', 'true')
    formData.append('acepta_tratamiento_datos', 'true')
    formData.append('cv', archivo)

    try {
      const res = await fetch(`${API_URL}/api/candidatos/aplicar`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al enviar tu aplicación')
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Aplicación recibida!</h2>
          <p className="text-gray-600 mb-6">
            Gracias por tu interés. Nuestro equipo revisará tu perfil y te contactaremos pronto.
          </p>
          <button
            onClick={() => setEnviado(false)}
            className="text-indigo-600 hover:underline text-sm"
          >
            Aplicar a otra vacante
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse inline-block"/>
            Convocatoria abierta
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Aplica a nuestra startup</h1>
          <p className="text-gray-500 mt-2">
            Completa el formulario y adjunta tu CV. Nuestro sistema con IA analizará tu perfil.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">

          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
              Datos personales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre completo *
                </label>
                <input
                  name="nombre_completo"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Ej: María García López"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={100}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Teléfono
                </label>
                <input
                  name="telefono"
                  type="tel"
                  maxLength={15}
                  placeholder="+57 300 123 4567"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ciudad de residencia
                </label>
                <input
                  name="ciudad"
                  type="text"
                  maxLength={60}
                  placeholder="Bogotá"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Vacante de interés
                </label>
                <select
                  name="vacante_id"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Selecciona una vacante</option>
                  {vacantes.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.titulo} — {v.modalidad}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
              Hoja de vida
            </h2>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${archivo ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}
              onClick={() => document.getElementById('cv-input')?.click()}
            >
              <input
                id="cv-input"
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setArchivo(e.target.files?.[0] || null)}
              />
              {archivo ? (
                <>
                  <div className="text-3xl mb-2">📄</div>
                  <p className="text-sm font-medium text-indigo-700">{archivo.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(archivo.size / 1024 / 1024).toFixed(2)} MB — Clic para cambiar
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">📎</div>
                  <p className="text-sm font-medium text-gray-700">Haz clic para subir tu CV</p>
                  <p className="text-xs text-gray-400 mt-1">PDF o Word · Máximo 10 MB</p>
                </>
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-blue-900">
              Tratamiento de datos personales — Ley 1581 de 2012
            </h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <span className="text-xs text-blue-800">
                Acepto los términos y condiciones del proceso de selección y declaro que
                la información suministrada es veraz y comprobable. *
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceptaTratamiento}
                onChange={(e) => setAceptaTratamiento(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <span className="text-xs text-blue-800">
                Autorizo el tratamiento de mis datos personales con fines de selección de personal,
                de acuerdo con la{' '}
                <a href="/privacidad" target="_blank" className="underline font-medium hover:text-blue-900">
                  Política de Privacidad
                </a>
                {' '}y la Ley Estatutaria 1581 de 2012. *
              </span>
            </label>
            <p className="text-xs text-blue-700 pt-1 border-t border-blue-200">
              Puedes ejercer tu derecho al olvido en cualquier momento desde{' '}
              <a href="/eliminar-datos" target="_blank" className="underline font-medium hover:text-blue-900">
                esta página
              </a>.
              Tus datos serán conservados máximo 2 años o hasta que solicites su eliminación.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !archivo || !aceptaTerminos || !aceptaTratamiento}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300
                       text-white font-medium py-3 px-4 rounded-xl text-sm
                       transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Enviando tu aplicación...
              </>
            ) : 'Enviar aplicación →'}
          </button>
        </form>
      </div>
    </div>
  )
}