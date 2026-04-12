'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

type Tenant = {
  id: string
  nit: string
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [recoverMode, setRecoverMode] = useState(false)

  useEffect(() => {
    loadTenants()
  }, [])

  async function loadTenants() {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, nit')
      .order('nit', { ascending: true })

    if (!error && data) {
      setTenants(data)
    }

    setLoadingTenants(false)
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!selectedTenant) {
      setMessage('Debes seleccionar una empresa')
      return
    }

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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: userRow } = await supabase
      .from('users')
      .select('tenant_id, role_id')
      .eq('id', user?.id)
      .single()

    if (!userRow) {
      setMessage('Usuario sin perfil asignado. Contacte al administrador.')
      setLoading(false)
      return
    }

    if (userRow.tenant_id !== selectedTenant) {
      setMessage('Este usuario no pertenece a la empresa seleccionada')
      setLoading(false)
      return
    }

    if (
      userRow.role_id === 1 ||
      userRow.role_id === '1' ||
      userRow.role_id === 'admin'
    ) {
      router.push('/admin')
    } else {
      router.push('/album')
    }

    router.refresh()
  }

  async function handleRecoverPassword() {
    if (!email) {
      setMessage('Ingresa tu correo para recuperar la contraseña')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Te enviamos un enlace para recuperar tu contraseña')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
      >
        <h1 className="text-2xl font-bold">Ingreso al Álbum Digital</h1>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold">
            Empresa (NIT)
          </label>

          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="w-full rounded-md border p-2"
          >
            <option value="">Selecciona una empresa</option>

            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.nit}
              </option>
            ))}
          </select>
        </div>

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

        {!recoverMode ? (
          <button
            type="submit"
            disabled={loading || loadingTenants}
            className="mt-6 w-full rounded-md bg-blue-600 p-2 text-white"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRecoverPassword}
            className="mt-6 w-full rounded-md bg-orange-500 p-2 text-white"
          >
            Enviar enlace de recuperación
          </button>
        )}

        <button
          type="button"
          onClick={() => setRecoverMode(!recoverMode)}
          className="mt-4 text-sm text-blue-600 underline"
        >
          {recoverMode
            ? 'Volver al login'
            : '¿Olvidaste tu contraseña?'}
        </button>

        {message && (
          <p className="mt-4 text-sm text-red-600">{message}</p>
        )}
      </form>
    </main>
  )
}