'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Contraseña actualizada correctamente')
    setLoading(false)

    setTimeout(() => {
      router.push('/login')
      router.refresh()
    }, 1500)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form onSubmit={handleReset} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Restablecer contraseña</h1>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold">Nueva contraseña</label>
          <input
            type="password"
            className="w-full rounded-md border p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold">Confirmar contraseña</label>
          <input
            type="password"
            className="w-full rounded-md border p-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="********"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-blue-600 p-2 text-white disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
        </button>

        {message ? <p className="mt-4 text-sm">{message}</p> : null}
      </form>
    </main>
  )
}