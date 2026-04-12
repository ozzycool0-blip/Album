'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type CurrentUserRow = {
  id: string
  email: string
  tenant_id: string | null
  role_id: string | number | null
  full_name?: string | null
}

type TenantRow = {
  id: string
  nit: string | null
  name: string
  logo_url?: string | null
  color_primary?: string | null
  color_secondary?: string | null
  created_at?: string | null
}

type SelectionRow = {
  id: string
  tenant_id: string
  number: number | null
  name: string
  description?: string | null
  background_asset_url?: string | null
  color_accent?: string | null
  order_index?: number | null
  created_at?: string | null
  introduccion?: string | null
}

type UserRow = {
  id: string
  email: string
  tenant_id: string | null
  full_name?: string | null
  role_id: string | number | null
  created_at?: string | null
}

const ROLE_ADMIN_GENERAL = 1
const ROLE_ADMIN_LOCAL = 2
const ROLE_USER = 3

function isAdminGeneral(roleId: string | number | null | undefined) {
  return roleId === ROLE_ADMIN_GENERAL || roleId === String(ROLE_ADMIN_GENERAL)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-CO')
}

function roleLabel(roleId: string | number | null | undefined) {
  if (roleId === ROLE_ADMIN_GENERAL || roleId === String(ROLE_ADMIN_GENERAL)) {
    return 'Admin general'
  }
  if (roleId === ROLE_ADMIN_LOCAL || roleId === String(ROLE_ADMIN_LOCAL)) {
    return 'Admin local'
  }
  if (roleId === ROLE_USER || roleId === String(ROLE_USER)) {
    return 'Usuario'
  }
  return 'Sin rol'
}

export default function AdminGeneralPage() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [loadingPage, setLoadingPage] = useState(true)
  const [adminName, setAdminName] = useState('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'usuarios' | 'reportes'>('dashboard')
  const [globalMessage, setGlobalMessage] = useState('')

  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [selections, setSelections] = useState<SelectionRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])

  const [selectedTenantId, setSelectedTenantId] = useState('')

  const [newTenantName, setNewTenantName] = useState('')
  const [newTenantNit, setNewTenantNit] = useState('')
  const [newTenantSelections, setNewTenantSelections] = useState('5')
  const [newTenantColorPrimary, setNewTenantColorPrimary] = useState('#0033A0')
  const [newTenantColorSecondary, setNewTenantColorSecondary] = useState('#FFD700')

  const [newAdminLocalName, setNewAdminLocalName] = useState('')
  const [newAdminLocalEmail, setNewAdminLocalEmail] = useState('')
  const [newAdminLocalPassword, setNewAdminLocalPassword] = useState('')

  const [creatingTenant, setCreatingTenant] = useState(false)

  async function checkAdminAccess() {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      window.location.href = '/login'
      return
    }

    const { data: currentUser, error } = await supabase
      .from('users')
      .select('id, email, tenant_id, role_id, full_name')
      .eq('id', authUser.id)
      .single<CurrentUserRow>()

    if (error || !currentUser) {
      alert('No fue posible validar el acceso administrativo.')
      window.location.href = '/login'
      return
    }

    if (!isAdminGeneral(currentUser.role_id)) {
      alert('Acceso restringido. Esta sección es solo para administradores generales.')
      window.location.href = '/album'
      return
    }

    setAdminName(currentUser.full_name || currentUser.email || 'Administrador General')
    setSessionChecked(true)
  }

  async function loadAdminGeneralData() {
    setLoadingPage(true)

    try {
      const [tenantsRes, selectionsRes, usersRes] = await Promise.all([
        supabase
          .from('tenants')
          .select('id, nit, name, logo_url, color_primary, color_secondary, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('selections')
          .select(
            'id, tenant_id, number, name, description, background_asset_url, color_accent, order_index, created_at, introduccion'
          )
          .order('tenant_id', { ascending: true })
          .order('order_index', { ascending: true }),
        supabase
          .from('users')
          .select('id, email, tenant_id, full_name, role_id, created_at')
          .order('created_at', { ascending: false }),
      ])

      if (tenantsRes.error) throw tenantsRes.error
      if (selectionsRes.error) throw selectionsRes.error
      if (usersRes.error) throw usersRes.error

      const loadedTenants = (tenantsRes.data as TenantRow[]) || []
      const loadedSelections = (selectionsRes.data as SelectionRow[]) || []
      const loadedUsers = (usersRes.data as UserRow[]) || []

      setTenants(loadedTenants)
      setSelections(loadedSelections)
      setUsers(loadedUsers)

      setSelectedTenantId((prev) => {
        if (prev && loadedTenants.some((tenant) => tenant.id === prev)) return prev
        return loadedTenants[0]?.id || ''
      })
    } catch (error) {
      console.error(error)
      setGlobalMessage('No fue posible cargar la información del panel general.')
    } finally {
      setLoadingPage(false)
    }
  }

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (sessionChecked) {
      loadAdminGeneralData()
    }
  }, [sessionChecked])

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) || null,
    [tenants, selectedTenantId]
  )

  const tenantsWithMetrics = useMemo(() => {
    return tenants.map((tenant) => {
      const tenantSelections = selections.filter((selection) => selection.tenant_id === tenant.id)
      const tenantUsers = users.filter((user) => user.tenant_id === tenant.id)
      const adminLocals = tenantUsers.filter(
        (user) => user.role_id === ROLE_ADMIN_LOCAL || user.role_id === String(ROLE_ADMIN_LOCAL)
      ).length
      const finalUsers = tenantUsers.filter(
        (user) => user.role_id === ROLE_USER || user.role_id === String(ROLE_USER)
      ).length

      return {
        ...tenant,
        selectionsCount: tenantSelections.length,
        usersCount: tenantUsers.length,
        adminLocalsCount: adminLocals,
        finalUsersCount: finalUsers,
      }
    })
  }, [tenants, selections, users])

  const totalTenants = tenants.length
  const totalSelections = selections.length
  const totalUsers = users.length
  const totalAdminLocals = users.filter(
    (user) => user.role_id === ROLE_ADMIN_LOCAL || user.role_id === String(ROLE_ADMIN_LOCAL)
  ).length
  const totalFinalUsers = users.filter(
    (user) => user.role_id === ROLE_USER || user.role_id === String(ROLE_USER)
  ).length

  const selectedTenantSelections = useMemo(() => {
    return selections
      .filter((selection) => selection.tenant_id === selectedTenantId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  }, [selections, selectedTenantId])

  const selectedTenantUsers = useMemo(() => {
    return users.filter((user) => user.tenant_id === selectedTenantId)
  }, [users, selectedTenantId])

  async function handleRefresh() {
    setGlobalMessage('')
    await loadAdminGeneralData()
  }

  async function handleCreateTenant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreatingTenant(true)
    setGlobalMessage('')

    try {
      const totalSelectionsToCreate = Number(newTenantSelections)

      if (!newTenantName.trim()) {
        setGlobalMessage('Debes ingresar el nombre de la empresa.')
        return
      }

      if (!newTenantNit.trim()) {
        setGlobalMessage('Debes ingresar el NIT de la empresa.')
        return
      }

      if (!totalSelectionsToCreate || totalSelectionsToCreate <= 0) {
        setGlobalMessage('Debes ingresar una cantidad válida de selecciones.')
        return
      }

      if (!newAdminLocalName.trim()) {
        setGlobalMessage('Debes ingresar el nombre del administrador local.')
        return
      }

      if (!newAdminLocalEmail.trim()) {
        setGlobalMessage('Debes ingresar el correo del administrador local.')
        return
      }

      if (!newAdminLocalPassword.trim() || newAdminLocalPassword.trim().length < 6) {
        setGlobalMessage('La contraseña del administrador local debe tener mínimo 6 caracteres.')
        return
      }

      const response = await fetch('/api/admin-general/create-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_name: newTenantName.trim(),
          tenant_nit: newTenantNit.trim(),
          total_selections: totalSelectionsToCreate,
          color_primary: newTenantColorPrimary || null,
          color_secondary: newTenantColorSecondary || null,
          admin_full_name: newAdminLocalName.trim(),
          admin_email: newAdminLocalEmail.trim(),
          admin_password: newAdminLocalPassword.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setGlobalMessage(data.error || 'No fue posible crear el tenant.')
        return
      }

      setNewTenantName('')
      setNewTenantNit('')
      setNewTenantSelections('5')
      setNewTenantColorPrimary('#0033A0')
      setNewTenantColorSecondary('#FFD700')
      setNewAdminLocalName('')
      setNewAdminLocalEmail('')
      setNewAdminLocalPassword('')

      await loadAdminGeneralData()

      if (data?.tenant_id) {
        setSelectedTenantId(data.tenant_id)
      }

      setGlobalMessage(data?.message || 'Tenant, selecciones y administrador local creados correctamente.')
      setActiveTab('tenants')
    } catch (error) {
      console.error(error)
      setGlobalMessage('Ocurrió un error inesperado al crear el tenant.')
    } finally {
      setCreatingTenant(false)
    }
  }

  if (!sessionChecked || loadingPage) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b,#0f172a_55%,#020617)] p-8 text-white">
        Cargando panel administrativo general...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1d4ed8,#0f172a_45%,#020617)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 shadow-[0_18px_60px_rgba(2,8,23,0.45)] backdrop-blur-xl">
          <div className="bg-[linear-gradient(135deg,rgba(37,99,235,0.95),rgba(15,23,42,0.95)_65%,rgba(234,179,8,0.75))] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-blue-100">
                  Panel administrador general
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                  Control global de tenants y álbumes
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-blue-100/90">
                  Crea empresas, define la cantidad de selecciones iniciales del álbum, crea su administrador local y consulta el panorama general de usuarios y tenants.
                </p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/20"
                >
                  Refrescar datos
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                  <div className="text-[11px] font-black uppercase tracking-wide text-blue-100">Admin</div>
                  <div className="mt-1 text-sm font-bold">{adminName}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                  <div className="text-[11px] font-black uppercase tracking-wide text-blue-100">Tenants</div>
                  <div className="mt-1 text-2xl font-black">{totalTenants}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                  <div className="text-[11px] font-black uppercase tracking-wide text-blue-100">Selecciones</div>
                  <div className="mt-1 text-2xl font-black">{totalSelections}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                  <div className="text-[11px] font-black uppercase tracking-wide text-blue-100">Usuarios</div>
                  <div className="mt-1 text-2xl font-black">{totalUsers}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-slate-950/70 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'tenants', label: 'Tenants' },
                { id: 'usuarios', label: 'Usuarios' },
                { id: 'reportes', label: 'Reportes' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    activeTab === tab.id
                      ? 'bg-yellow-300 text-slate-950'
                      : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {globalMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {globalMessage}
          </div>
        ) : null}

        {activeTab === 'dashboard' ? (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Tenants</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{totalTenants}</div>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Selecciones</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{totalSelections}</div>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Admins locales</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{totalAdminLocals}</div>
              </div>
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Usuarios finales</div>
                <div className="mt-2 text-3xl font-black text-slate-900">{totalFinalUsers}</div>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Resumen por tenant</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Empresas registradas</h2>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-3 pr-4 font-black text-slate-700">Empresa</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">NIT</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">Selecciones</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">Usuarios</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">Admins locales</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantsWithMetrics.map((tenant) => (
                      <tr key={tenant.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4">
                          <div className="font-bold text-slate-900">{tenant.name}</div>
                          <div className="text-xs text-slate-500">{tenant.id}</div>
                        </td>
                        <td className="py-3 pr-4 text-slate-700">{tenant.nit || '—'}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-800">{tenant.selectionsCount}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-800">{tenant.usersCount}</td>
                        <td className="py-3 pr-4 font-semibold text-slate-800">{tenant.adminLocalsCount}</td>
                        <td className="py-3 pr-4 text-slate-700">{formatDate(tenant.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'tenants' ? (
          <section className="grid gap-6 xl:grid-cols-[460px_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Nuevo tenant</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Crear empresa</h2>
              <p className="mt-2 text-sm text-slate-600">
                Crea una empresa nueva, genera automáticamente las selecciones base del álbum y registra su administrador local.
              </p>

              <form onSubmit={handleCreateTenant} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Nombre de la empresa</label>
                  <input
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                    placeholder="Ejemplo: QMAX"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">NIT de la empresa</label>
                  <input
                    value={newTenantNit}
                    onChange={(e) => setNewTenantNit(e.target.value)}
                    placeholder="Ejemplo: 900123456-7"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Número de selecciones del álbum
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTenantSelections}
                    onChange={(e) => setNewTenantSelections(e.target.value)}
                    placeholder="Ejemplo: 5"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Color principal</label>
                    <input
                      type="color"
                      value={newTenantColorPrimary}
                      onChange={(e) => setNewTenantColorPrimary(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-2 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Color secundario</label>
                    <input
                      type="color"
                      value={newTenantColorSecondary}
                      onChange={(e) => setNewTenantColorSecondary(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-white px-2 py-2"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Administrador local
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Nombre del administrador local</label>
                      <input
                        value={newAdminLocalName}
                        onChange={(e) => setNewAdminLocalName(e.target.value)}
                        placeholder="Ejemplo: Juan Pérez"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Correo del administrador local</label>
                      <input
                        type="email"
                        value={newAdminLocalEmail}
                        onChange={(e) => setNewAdminLocalEmail(e.target.value)}
                        placeholder="Ejemplo: admin@qmax.com"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">Contraseña del administrador local</label>
                      <input
                        type="password"
                        value={newAdminLocalPassword}
                        onChange={(e) => setNewAdminLocalPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingTenant}
                  className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                >
                  {creatingTenant ? 'Creando tenant...' : 'Crear tenant completo'}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Tenants</div>
                    <h2 className="mt-2 text-xl font-black text-slate-900">Empresas registradas</h2>
                  </div>

                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                  >
                    <option value="">Selecciona un tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="pb-3 pr-4 font-black text-slate-700">Empresa</th>
                        <th className="pb-3 pr-4 font-black text-slate-700">NIT</th>
                        <th className="pb-3 pr-4 font-black text-slate-700">Selecciones</th>
                        <th className="pb-3 pr-4 font-black text-slate-700">Usuarios</th>
                        <th className="pb-3 pr-4 font-black text-slate-700">Creado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantsWithMetrics.map((tenant) => (
                        <tr
                          key={tenant.id}
                          className={`border-b border-slate-100 cursor-pointer ${
                            selectedTenantId === tenant.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedTenantId(tenant.id)}
                        >
                          <td className="py-3 pr-4">
                            <div className="font-bold text-slate-900">{tenant.name}</div>
                            <div className="mt-1 flex gap-2">
                              <span
                                className="inline-block h-4 w-4 rounded-full border border-slate-300"
                                style={{ backgroundColor: tenant.color_primary || '#0033A0' }}
                              />
                              <span
                                className="inline-block h-4 w-4 rounded-full border border-slate-300"
                                style={{ backgroundColor: tenant.color_secondary || '#FFD700' }}
                              />
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-700">{tenant.nit || '—'}</td>
                          <td className="py-3 pr-4 font-semibold text-slate-800">{tenant.selectionsCount}</td>
                          <td className="py-3 pr-4 font-semibold text-slate-800">{tenant.usersCount}</td>
                          <td className="py-3 pr-4 text-slate-700">{formatDate(tenant.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Selecciones</div>
                  <h2 className="mt-2 text-xl font-black text-slate-900">
                    {selectedTenant ? `Selecciones de ${selectedTenant.name}` : 'Selecciona un tenant'}
                  </h2>

                  <div className="mt-5 space-y-3">
                    {selectedTenantSelections.length > 0 ? (
                      selectedTenantSelections.map((selection) => (
                        <div key={selection.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-black text-slate-900">
                                {selection.number || selection.order_index || 0}. {selection.name}
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                {selection.description || 'Sin descripción'}
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                Introducción: {selection.introduccion?.trim() || 'Sin introducción'}
                              </div>
                            </div>
                            <div className="text-xs font-semibold text-slate-500">
                              Orden {selection.order_index || '—'}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        Este tenant todavía no tiene selecciones.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Detalle</div>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Resumen del tenant</h2>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Empresa</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{selectedTenant?.name || '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">NIT</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{selectedTenant?.nit || '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Selecciones</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">{selectedTenantSelections.length}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Usuarios</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">{selectedTenantUsers.length}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Creado</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">
                        {formatDate(selectedTenant?.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'usuarios' ? (
          <section className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Usuarios</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Usuarios globales</h2>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-3 pr-4 font-black text-slate-700">Nombre</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">Correo</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">Rol</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">Tenant</th>
                      <th className="pb-3 pr-4 font-black text-slate-700">Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const tenant = tenants.find((item) => item.id === user.tenant_id)
                      return (
                        <tr key={user.id} className="border-b border-slate-100">
                          <td className="py-3 pr-4 font-semibold text-slate-900">{user.full_name || '—'}</td>
                          <td className="py-3 pr-4 text-slate-700">{user.email}</td>
                          <td className="py-3 pr-4">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                              {roleLabel(user.role_id)}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-700">{tenant?.name || 'Sin tenant'}</td>
                          <td className="py-3 pr-4 text-slate-700">{formatDate(user.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'reportes' ? (
          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Reporte</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Usuarios por tenant</h2>

              <div className="mt-5 space-y-3">
                {tenantsWithMetrics.map((tenant) => (
                  <div key={tenant.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{tenant.name}</div>
                        <div className="mt-1 text-xs text-slate-500">NIT: {tenant.nit || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">{tenant.usersCount}</div>
                        <div className="text-xs font-semibold text-slate-500">usuarios</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Reporte</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Selecciones por tenant</h2>

              <div className="mt-5 space-y-3">
                {tenantsWithMetrics.map((tenant) => (
                  <div key={tenant.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-black text-slate-900">{tenant.name}</div>
                        <div className="mt-1 text-xs text-slate-500">Creado: {formatDate(tenant.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">{tenant.selectionsCount}</div>
                        <div className="text-xs font-semibold text-slate-500">selecciones</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  )
}