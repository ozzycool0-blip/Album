'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Login exitoso')
    router.push('/album')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-xl border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Login Álbum HSEQ</h1>

        <div className="mt-4">
          <label className="mb-1 block text-sm">Correo</label>
          <input
            type="email"
            className="w-full rounded-md border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@empresa.com"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm">Contraseña</label>
          <input
            type="password"
            className="w-full rounded-md border p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-black p-2 text-white disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        {message ? <p className="mt-4 text-sm">{message}</p> : null}
      </form>
    </main>
  )
}