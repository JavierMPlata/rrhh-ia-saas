'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { Vacante } from '@/lib/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TELEFONO_REGEX = /^[0-9+\-\s]{7,15}$/
const PATRONES_PELIGROSOS = ['../', '..\\', '/etc/', 'c:\\', 'c:/', 'system.ini', 'win.ini', 'web-inf', '<', '{%', '{{', '${', '#{']

function esPeligroso(valor: string): boolean {
  return PATRONES_PELIGROSOS.some(p => valor.toLowerCase().includes(p.toLowerCase()))
}

export default function FormularioPublico() {
  const supabase = createClient()
  const [vacantes, setVacantes] = useState<Vacante[]>([])
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)

  // Checkboxes controlados — booleanos puros, no strings
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaTratamiento, setAceptaTratamiento] = useState(false)

  useEffect(() => {
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

    // Validar checkboxes — deben ser true booleano
    if (!aceptaTerminos || !aceptaTratamiento) {
      setError('Debes aceptar los términos y el tratamiento de datos personales')
      setLoading(false)
      return
    }

    // Validar archivo
    if (!archivo) {
      setError('Por favor adjunta tu hoja de vida (PDF o Word)')
      setLoading(false)
      return
    }

    // Validar inputs contra path traversal e inyección
    for (const [campo, valor] of [['Nombre', nombreCompleto], ['Ciudad', ciudad]]) {
      if (esPeligroso(valor)) {
        setError(`El campo ${campo} contiene caracteres no permitidos`)
        setLoading(false)
        return
      }
    }

    // Validar teléfono
    if (telefono && !TELEFONO_REGEX.test(telefono)) {
      setError('El teléfono solo puede contener números, espacios, + y -')
      setLoading(false)
      return
    }

    // Validar vacante_id — debe ser UUID válido o vacío
    if (vacanteId && !UUID_REGEX.test(vacanteId)) {
      setError('La vacante seleccionada no es válida')
      setLoading(false)
      return
    }

    // Construir FormData con booleanos explícitos — no strings
    const formData = new FormData()
    formData.append('nombre_completo', nombreCompleto)
    formData.append('email', email)
    formData.append('telefono', telefono)
    formData.append('ciudad', ciudad)
    formData.append('vacante_id', vacanteId)
    formData.append('acepta_terminos', 'true')          // siempre string "true" validado arriba
    formData.append('acepta_tratamiento_datos', 'true') // siempre string "true" validado arriba
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-orange-600/20 blur-3xl" />
        <div className="max-w-md w-full text-center relative z-10">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-5 rotate-3">
            <svg className="w-8 h-8 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">¡Aplicación recibida!</h2>
          <p className="text-gray-400 mb-8">
            Gracias por tu interés en la Universidad de San Buenaventura Bogotá.
            Nuestro equipo revisará tu perfil y te contactaremos pronto.
          </p>
          <button
            onClick={() => setEnviado(false)}
            className="text-orange-400 hover:text-orange-300 text-sm font-medium border border-orange-500/40 hover:border-orange-400 rounded-lg px-5 py-2.5 transition-colors"
          >
            Aplicar a otra vacante
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero institucional */}
      <div className="bg-gray-950 relative overflow-hidden">
        <div className="absolute -top-32 right-0 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-orange-600/10 blur-3xl" />
        <div className="max-w-3xl mx-auto px-4 pt-14 pb-20 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-gray-950 text-xs font-bold">
              USB
            </div>
            <div className="leading-tight">
              <p className="text-white text-sm font-semibold">Universidad de San Buenaventura</p>
              <p className="text-orange-400 text-xs">Bogotá D.C. · Talento Humano</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 text-orange-300 text-xs font-medium px-3 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block"/>
            Convocatoria abierta
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight max-w-xl">
            Construye tu carrera en la comunidad franciscana
          </h1>
          <p className="text-gray-400 mt-3 max-w-lg text-sm leading-relaxed">
            Completa el formulario y adjunta tu hoja de vida. Nuestro sistema con
            inteligencia artificial analizará tu perfil frente a la vacante elegida.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10 pb-16 relative z-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-8 space-y-6">

          {/* Datos personales */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="text-base font-semibold text-gray-800">Datos personales</h2>
            </div>
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Vacante de interés
                </label>
                <select
                  name="vacante_id"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
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

          {/* CV Upload */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="text-base font-semibold text-gray-800">Hoja de vida</h2>
            </div>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${archivo ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/40'}`}
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
                  <p className="text-sm font-medium text-orange-700">{archivo.name}</p>
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

          {/* Consentimiento Ley 1581/2012 — checkboxes controlados */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-base font-semibold text-gray-800">Consentimiento</h2>
            </div>
            <div className="bg-gray-950 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-orange-400">
                Tratamiento de datos personales — Ley 1581 de 2012
              </h3>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4 text-orange-500 border-gray-500 rounded accent-orange-500"
                />
                <span className="text-xs text-gray-300">
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
                  className="mt-0.5 h-4 w-4 text-orange-500 border-gray-500 rounded accent-orange-500"
                />
                <span className="text-xs text-gray-300">
                  Autorizo el tratamiento de mis datos personales con fines de selección de personal,
                  de acuerdo con la{' '}
                  <a href="/privacidad" target="_blank" className="underline font-medium text-orange-400 hover:text-orange-300">
                    Política de Privacidad
                  </a>
                  {' '}y la Ley Estatutaria 1581 de 2012. *
                </span>
              </label>
              <p className="text-xs text-gray-400 pt-1 border-t border-gray-800">
                Puedes ejercer tu derecho al olvido en cualquier momento desde{' '}
                <a href="/eliminar-datos" target="_blank" className="underline font-medium text-orange-400 hover:text-orange-300">
                  esta página
                </a>.
                Tus datos serán conservados máximo 2 años o hasta que solicites su eliminación.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !archivo || !aceptaTerminos || !aceptaTratamiento}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-gray-200 disabled:text-gray-400
                       text-gray-950 font-semibold py-3 px-4 rounded-xl text-sm
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

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Eres parte del equipo de RRHH?{' '}
          <a href="/login" className="text-orange-600 hover:underline font-medium">Inicia sesión aquí</a>
        </p>
      </div>
    </div>
  )
}
