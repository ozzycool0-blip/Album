'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [validatingLink, setValidatingLink] = useState(true)
  const [linkReady, setLinkReady] = useState(false)

  useEffect(() => {
    async function prepareRecoverySession() {
      try {
        setMessage('')

        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            setMessage(
              'El enlace de recuperación es inválido o expiró. Solicita uno nuevo.'
            )
            setLinkReady(false)
            return
          }

          setLinkReady(true)
          return
        }

        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.substring(1)
          : window.location.hash

        const hashParams = new URLSearchParams(hash)
        const type = hashParams.get('type')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (type === 'recovery' && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            setMessage(
              'El enlace de recuperación es inválido o expiró. Solicita uno nuevo.'
            )
            setLinkReady(false)
            return
          }

          setLinkReady(true)
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          setLinkReady(true)
          return
        }

        setMessage(
          'El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.'
        )
        setLinkReady(false)
      } catch (error) {
        console.error('Error preparando recuperación de contraseña:', error)
        setMessage(
          'No fue posible validar el enlace de recuperación. Solicita uno nuevo.'
        )
        setLinkReady(false)
      } finally {
        setValidatingLink(false)
      }
    }

    prepareRecoverySession()
  }, [])

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (!linkReady) {
      setMessage(
        'El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo.'
      )
      return
    }

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

    await supabase.auth.signOut()

    setLoading(false)

    setTimeout(() => {
      router.push('/login')
      router.refresh()
    }, 1500)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={handleReset}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      >
        <h1 className="text-2xl font-bold">Restablecer contraseña</h1>

        {validatingLink ? (
          <p className="mt-4 text-sm text-slate-600">
            Validando enlace de recuperación...
          </p>
        ) : (
          <>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold">
                Nueva contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-md border p-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                disabled={!linkReady || loading}
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-semibold">
                Confirmar contraseña
              </label>
              <input
                type="password"
                className="w-full rounded-md border p-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="********"
                disabled={!linkReady || loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !linkReady}
              className="mt-6 w-full rounded-md bg-blue-600 p-2 text-white disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>
          </>
        )}

        {message ? <p className="mt-4 text-sm">{message}</p> : null}
      </form>
    </main>
  )
}
