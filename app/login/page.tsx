'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()

  const [nit, setNit] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoverMode, setRecoverMode] = useState(false)

  function handleNitChange(value: string) {
    // Permitir solo números
    const numericValue = value.replace(/\D/g, '')
    setNit(numericValue)
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const nitLimpio = nit.trim()
    const emailLimpio = email.trim().toLowerCase()

    if (!nitLimpio) {
      setMessage('Debes ingresar el NIT de la empresa')
      return
    }

    if (!emailLimpio) {
      setMessage('Debes ingresar tu correo')
      return
    }

    if (!password) {
      setMessage('Debes ingresar tu contraseña')
      return
    }

    setLoading(true)
    setMessage('')

    // Buscar tenant por NIT
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, nit')
      .eq('nit', nitLimpio)
      .maybeSingle()

    if (tenantError) {
      setMessage('Error consultando la empresa')
      setLoading(false)
      return
    }

    if (!tenantData) {
      setMessage('El NIT ingresado no existe')
      setLoading(false)
      return
    }

    // Login usuario
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: emailLimpio,
      password,
    })

    if (loginError) {
      setMessage('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('No fue posible obtener el usuario autenticado')
      setLoading(false)
      return
    }

    // Validar tenant del usuario
    const { data: userRow, error: profileError } = await supabase
      .from('users')
      .select('tenant_id, role_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      setMessage('Error validando el perfil del usuario')
      setLoading(false)
      return
    }

    if (!userRow) {
      await supabase.auth.signOut()
      setMessage('Usuario sin perfil asignado. Contacte al administrador.')
      setLoading(false)
      return
    }

    if (userRow.tenant_id !== tenantData.id) {
      await supabase.auth.signOut()
      setMessage('El usuario no pertenece a la empresa indicada por el NIT')
      setLoading(false)
      return
    }

    // Redirección por rol
    const roleId = String(userRow.role_id)

    if (roleId === '1' || roleId === 'admin') {
      router.push('/admin')
    } else {
      router.push('/album')
    }

    router.refresh()
    setLoading(false)
  }

  async function handleRecoverPassword() {
    const emailLimpio = email.trim().toLowerCase()

    if (!emailLimpio) {
      setMessage('Ingresa tu correo para recuperar la contraseña')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(emailLimpio, {
      redirectTo: window.location.origin + '/reset-password',
    })

    if (error) {
      setMessage('Error sending recovery email')
      setLoading(false)
      return
    }

    setMessage('Te enviamos un enlace para recuperar tu contraseña')
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      >
        <h1 className="text-2xl font-bold">Ingreso al Álbum Digital</h1>

        {/* NIT */}
        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold">
            NIT de la empresa
          </label>

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={12}
            className="w-full rounded-md border p-2"
            value={nit}
            onChange={(e) => handleNitChange(e.target.value)}
            placeholder="Ej: 900123456"
          />
        </div>

        {/* EMAIL */}
        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold">
            Correo
          </label>

          <input
            type="email"
            className="w-full rounded-md border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@empresa.com"
          />
        </div>

        {/* PASSWORD */}
        {!recoverMode && (
          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold">
              Contraseña
            </label>

            <input
              type="password"
              className="w-full rounded-md border p-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>
        )}

        {/* BOTÓN PRINCIPAL */}
        {!recoverMode ? (
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-md bg-blue-600 p-2 text-white disabled:opacity-70"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRecoverPassword}
            disabled={loading}
            className="mt-6 w-full rounded-md bg-orange-500 p-2 text-white disabled:opacity-70"
          >
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        )}

        {/* LINK RECUPERAR */}
        <button
          type="button"
          onClick={() => {
            setRecoverMode(!recoverMode)
            setMessage('')
          }}
          className="mt-4 text-sm text-blue-600 underline"
        >
          {recoverMode
            ? 'Volver al login'
            : '¿Olvidaste tu contraseña?'}
        </button>

        {/* MENSAJES */}
        {message && (
          <p className="mt-4 text-sm text-red-600">{message}</p>
        )}
      </form>
    </main>
  )
}