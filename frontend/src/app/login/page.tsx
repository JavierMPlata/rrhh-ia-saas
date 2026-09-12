'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const [error, setError] = useState(
    searchParams.get('error') === 'cuenta_inactiva'
      ? 'Tu cuenta ha sido desactivada. Contacta al administrador.'
      : ''
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Panel izquierdo — identidad institucional */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-950 overflow-hidden flex-col justify-between p-12">
        {/* Formas decorativas naranjas */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-orange-600/20 blur-3xl" />
        <div className="absolute top-1/3 right-10 w-40 h-40 border-2 border-orange-500/30 rounded-3xl rotate-12" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-gray-950 font-bold">
            USB
          </div>
          <div className="leading-tight">
            <p className="text-white font-semibold">Universidad de San Buenaventura</p>
            <p className="text-orange-400 text-xs">Bogotá D.C.</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-orange-400 text-sm font-medium tracking-wide mb-3">Sistema RRHH con IA</p>
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Selecciona mejor,
            <br />
            decide con datos.
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Gestiona vacantes, revisa candidatos evaluados por inteligencia artificial
            y toma decisiones de contratación más rápidas y justas, todo desde un
            mismo panel.
          </p>
        </div>

        <div className="relative z-10 flex gap-8 text-sm">
          <div>
            <p className="text-white text-2xl font-bold">IA</p>
            <p className="text-gray-400">Análisis de CV</p>
          </div>
          <div>
            <p className="text-white text-2xl font-bold">24/7</p>
            <p className="text-gray-400">Recepción de aplicaciones</p>
          </div>
          <div>
            <p className="text-white text-2xl font-bold">Ley 1581</p>
            <p className="text-gray-400">Protección de datos</p>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-sm w-full">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gray-950 flex items-center justify-center text-orange-400 text-xs font-bold">
              USB
            </div>
            <span className="font-semibold text-gray-900">Panel de Selección</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Inicia sesión</h2>
            <p className="text-gray-500 text-sm mt-1">
              Acceso exclusivo para el equipo de Recursos Humanos
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rrhh@usbbog.edu.co"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}
            <button
              type="submit" disabled={loading}
              className="w-full bg-gray-950 hover:bg-black disabled:bg-gray-400 text-orange-400 font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-8 text-center">
            ¿Buscas aplicar a una vacante?{' '}
            <a href="/" className="text-orange-600 hover:underline font-medium">Ve al formulario público</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full"/></div>}>
      <LoginForm />
    </Suspense>
  )
}
