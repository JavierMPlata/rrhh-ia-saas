'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setEmail(user.email || '')
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
          RH
        </div>
        <h1 className="text-2xl font-bold text-gray-900">¡Bienvenido al Dashboard!</h1>
        <p className="text-gray-500 mt-2">Sesión activa: {email}</p>
        <button
          onClick={handleLogout}
          className="mt-6 px-6 py-2.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}