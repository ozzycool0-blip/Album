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

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: emailLimpio,
      password,
    })

    if (loginError) {
      setMessage('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setMessage('No fue posible obtener el usuario autenticado')
      setLoading(false)
      return
    }

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

  const isErrorMessage =
    message.includes('Error') ||
    message.includes('incorrect') ||
    message.includes('no existe') ||
    message.includes('no pertenece') ||
    message.includes('sin perfil') ||
    message.includes('Debes ingresar') ||
    message.includes('Ingresa tu correo')

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(220,38,38,0.16),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="absolute -left-16 bottom-8 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute -right-16 top-1/3 h-44 w-44 rounded-full bg-red-500/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[430px]">
          <form
            onSubmit={handleLogin}
            className="relative overflow-hidden rounded-[28px] border border-yellow-400/35 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(2,6,23,0.98))] px-5 py-6 shadow-[0_20px_70px_rgba(0,0,0,0.55)] sm:px-7 sm:py-8"
          >
            <div className="absolute inset-[10px] rounded-[22px] border border-white/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500" />
            <div className="absolute left-1/2 top-0 h-24 w-40 -translate-x-1/2 bg-yellow-300/10 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-6 text-center">
                <div className="mx-auto inline-flex rounded-xl border border-yellow-400/50 bg-gradient-to-b from-yellow-300 to-amber-500 px-4 py-1 text-xs font-black tracking-[0.2em] text-slate-900 shadow-md">
                  ÁLBUM DIGITAL
                </div>

                <div className="mx-auto mt-3 max-w-[280px] rounded-[18px] border border-red-900/70 bg-[linear-gradient(180deg,#9f1239_0%,#991b1b_55%,#7f1d1d_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_20px_rgba(127,29,29,0.45)]">
                  <h1 className="text-[28px] font-extrabold uppercase leading-none tracking-wide text-yellow-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] sm:text-[32px]">
                    Álbum Digital
                  </h1>
                </div>

                <p className="mt-5 text-xl font-extrabold italic text-yellow-200 sm:text-2xl">
                  {recoverMode ? 'Recuperar acceso' : 'Ingreso al Álbum Digital'}
                </p>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-black/25 p-4 sm:p-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-extrabold text-yellow-300">
                      <span className="text-base">🏢</span>
                      NIT de la empresa
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={12}
                      className="w-full rounded-xl border border-white/15 bg-[#050816] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
                      value={nit}
                      onChange={(e) => handleNitChange(e.target.value)}
                      placeholder="Ej: 900123456"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-extrabold text-yellow-300">
                      <span className="text-base">✉️</span>
                      Correo
                    </label>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-white/15 bg-[#050816] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@empresa.com"
                    />
                  </div>

                  {!recoverMode && (
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-extrabold text-yellow-300">
                        <span className="text-base">🔒</span>
                        Contraseña
                      </label>
                      <input
                        type="password"
                        className="w-full rounded-xl border border-white/15 bg-[#050816] px-4 py-3 text-sm font-medium text-white outline-none transition placeholder:text-slate-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                      />
                    </div>
                  )}
                </div>

                {!recoverMode ? (
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 w-full rounded-xl border border-yellow-400/60 bg-[linear-gradient(180deg,#ef4444_0%,#b91c1c_55%,#7f1d1d_100%)] px-4 py-3 text-base font-extrabold text-yellow-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_20px_rgba(127,29,29,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRecoverPassword}
                    disabled={loading}
                    className="mt-6 w-full rounded-xl border border-sky-400/50 bg-[linear-gradient(180deg,#1d4ed8_0%,#1e40af_55%,#1e3a8a_100%)] px-4 py-3 text-base font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_20px_rgba(30,58,138,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                )}

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoverMode(!recoverMode)
                      setMessage('')
                    }}
                    className="text-sm font-bold text-amber-300 underline decoration-amber-300/50 underline-offset-4 hover:text-yellow-200"
                  >
                    {recoverMode ? 'Volver al login' : '¿Olvidaste tu contraseña?'}
                  </button>
                </div>

                {message && (
                  <div
                    className={`mt-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
                      isErrorMessage
                        ? 'border-red-500/30 bg-red-500/10 text-red-200'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    }`}
                  >
                    {message}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
