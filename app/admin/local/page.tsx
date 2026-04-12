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

type UserRow = {
  id: string
  email: string
  tenant_id: string | null
  full_name?: string | null
}

type SelectionRow = {
  id: string
  name: string
  order_index: number | null
  tenant_id: string
  number?: number | null
}

type StickerRow = {
  id: string
  sticker_number: number
  name: string
  selection_id: string
  tenant_id: string
  is_active?: boolean | null
}

type IssuedStickerRow = {
  id: string
  user_id: string
  sticker_id: string
  pack_id?: string | null
  created_at?: string | null
}

type PlacementRow = {
  id: string
  user_id: string
  sticker_id: string
  selection_id: string
  tenant_id: string
  created_at?: string | null
}

type StickerPackRow = {
  id: string
  user_id: string
  tenant_id: string
  created_at?: string | null
}

type UserSelectionPhotoRow = {
  id: string
  user_id: string
  selection_id: string
  tenant_id: string
  photo_url: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type SelectionStatus = 'sin-laminas' | 'sin-iniciar' | 'completa' | 'en-progreso'

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es-CO')
}

const ROLE_ADMIN_GENERAL = 1
const ROLE_ADMIN_LOCAL = 2

const INTRO_SELECTION_ORDER = 0
const INTRO_SELECTION_NAME = 'Indicaciones de llenado'
const USER_PHOTOS_TABLE = 'user_selection_photos'

function isAdminGeneral(roleId: string | number | null | undefined) {
  return roleId === ROLE_ADMIN_GENERAL || roleId === String(ROLE_ADMIN_GENERAL)
}

function isAdminLocal(roleId: string | number | null | undefined) {
  return roleId === ROLE_ADMIN_LOCAL || roleId === String(ROLE_ADMIN_LOCAL)
}

function isAnyAdmin(roleId: string | number | null | undefined) {
  return isAdminGeneral(roleId) || isAdminLocal(roleId)
}

function randomPickWithoutDuplicates<T>(items: T[], size: number) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, size)
}

function isIntroSelection(selection: SelectionRow) {
  return (
    selection.order_index === INTRO_SELECTION_ORDER ||
    selection.name.trim().toLowerCase() === INTRO_SELECTION_NAME.toLowerCase()
  )
}

export default function AdminPagePaniniV3() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [loadingPage, setLoadingPage] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [selections, setSelections] = useState<SelectionRow[]>([])
  const [stickers, setStickers] = useState<StickerRow[]>([])
  const [issuedStickers, setIssuedStickers] = useState<IssuedStickerRow[]>([])
  const [placements, setPlacements] = useState<PlacementRow[]>([])
  const [packs, setPacks] = useState<StickerPackRow[]>([])
  const [userSelectionPhotos, setUserSelectionPhotos] = useState<UserSelectionPhotoRow[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [globalMessage, setGlobalMessage] = useState('')
  const [loadingAction, setLoadingAction] = useState(false)
  const [sendingAllUsers, setSendingAllUsers] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'usuarios' | 'sobres' | 'control'>('dashboard')

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [createUserMessage, setCreateUserMessage] = useState('')

  const [packSize, setPackSize] = useState('3')

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

    if (error || !currentUser?.tenant_id) {
      alert('No fue posible validar el acceso administrativo.')
      window.location.href = '/login'
      return
    }

    if (!isAdminLocal(currentUser.role_id)) {
      alert('Acceso restringido. Esta sección es solo para administradores locales.')
      window.location.href = '/album'
      return
    }

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', currentUser.tenant_id)
      .single()

    setTenantId(currentUser.tenant_id)
    setTenantName(tenantData?.name || 'Tenant')
    setAdminName(currentUser.full_name || currentUser.email || 'Administrador')
    setSessionChecked(true)
  }

  async function loadAdminData(currentTenantId: string) {
    setLoadingPage(true)
    try {
      const tenantUsersRes = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', currentTenantId)

      const tenantUserIds = (tenantUsersRes.data || []).map((u: { id: string }) => u.id)

      const [
        usersRes,
        selectionsRes,
        stickersRes,
        issuedRes,
        placementsRes,
        packsRes,
        photosRes,
      ] = await Promise.all([
        supabase
          .from('users')
          .select('id, email, tenant_id, full_name')
          .eq('tenant_id', currentTenantId)
          .order('email', { ascending: true }),
        supabase
          .from('selections')
          .select('id, name, order_index, tenant_id, number')
          .eq('tenant_id', currentTenantId)
          .order('order_index', { ascending: true }),
        supabase
          .from('stickers')
          .select('id, sticker_number, name, selection_id, tenant_id, is_active')
          .eq('tenant_id', currentTenantId)
          .eq('is_active', true)
          .order('sticker_number', { ascending: true }),
        tenantUserIds.length > 0
          ? supabase
              .from('issued_stickers')
              .select('id, user_id, sticker_id, pack_id, created_at')
              .in('user_id', tenantUserIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('user_sticker_placements')
          .select('id, user_id, sticker_id, selection_id, tenant_id, created_at')
          .eq('tenant_id', currentTenantId),
        supabase
          .from('sticker_packs')
          .select('id, user_id, tenant_id, created_at')
          .eq('tenant_id', currentTenantId)
          .order('created_at', { ascending: false }),
        supabase
          .from(USER_PHOTOS_TABLE)
          .select('id, user_id, selection_id, tenant_id, photo_url, status, created_at, updated_at')
          .eq('tenant_id', currentTenantId),
      ])

      setUsers((usersRes.data as UserRow[]) || [])
      setSelections((selectionsRes.data as SelectionRow[]) || [])
      setStickers((stickersRes.data as StickerRow[]) || [])
      setIssuedStickers((issuedRes.data as IssuedStickerRow[]) || [])
      setPlacements((placementsRes.data as PlacementRow[]) || [])
      setPacks((packsRes.data as StickerPackRow[]) || [])
      setUserSelectionPhotos((photosRes.data as UserSelectionPhotoRow[]) || [])

      const firstUserId = ((usersRes.data as UserRow[]) || [])[0]?.id || ''
      setSelectedUserId((prev) => {
        const exists = ((usersRes.data as UserRow[]) || []).some((user) => user.id === prev)
        return exists ? prev : firstUserId
      })
    } catch (error) {
      console.error(error)
      setGlobalMessage('No fue posible cargar toda la información del panel admin.')
    } finally {
      setLoadingPage(false)
    }
  }

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (sessionChecked && tenantId) {
      loadAdminData(tenantId)
    }
  }, [sessionChecked, tenantId])

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId]
  )

  const stickerById = useMemo(() => {
    return stickers.reduce<Record<string, StickerRow>>((acc, sticker) => {
      acc[sticker.id] = sticker
      return acc
    }, {})
  }, [stickers])

  const stickersBySelection = useMemo(() => {
    return stickers.reduce<Record<string, StickerRow[]>>((acc, sticker) => {
      if (!acc[sticker.selection_id]) acc[sticker.selection_id] = []
      acc[sticker.selection_id].push(sticker)
      return acc
    }, {})
  }, [stickers])

  const totalUsers = users.length
  const totalStickers = stickers.length
  const totalSelections = selections.length

  const totalIssued = useMemo(() => {
    return new Set(issuedStickers.map((item) => `${item.user_id}-${item.sticker_id}`)).size
  }, [issuedStickers])

  const totalPlaced = useMemo(() => {
    return new Set(placements.map((item) => `${item.user_id}-${item.sticker_id}`)).size
  }, [placements])

  const userProgressRows = useMemo(() => {
    return users.map((user) => {
      const issuedStickerIds = new Set(
        issuedStickers
          .filter((item) => item.user_id === user.id)
          .map((item) => item.sticker_id)
      )

      const placedStickerIds = new Set(
        placements
          .filter((item) => item.user_id === user.id)
          .map((item) => item.sticker_id)
      )

      const issuedCount = issuedStickerIds.size
      const placedCount = placedStickerIds.size
      const missingCount = Math.max(totalStickers - placedCount, 0)

      const selectionStats = selections.map((selection) => {
        if (isIntroSelection(selection)) {
          const completed = userSelectionPhotos.some(
            (photo) =>
              photo.user_id === user.id &&
              photo.selection_id === selection.id &&
              Boolean(photo.photo_url)
          )

          return {
            selectionId: selection.id,
            total: 1,
            obtained: completed ? 1 : 0,
            missing: completed ? 0 : 1,
            status: completed ? 'completa' : 'sin-iniciar',
          }
        }

        const selectionStickers = stickersBySelection[selection.id] || []
        const total = selectionStickers.length
        const obtainedCount = selectionStickers.filter((sticker) => placedStickerIds.has(sticker.id)).length
        const missing = total - obtainedCount

        let status: SelectionStatus = 'sin-laminas'
        if (total === 0) {
          status = 'sin-laminas'
        } else if (missing === total) {
          status = 'sin-iniciar'
        } else if (missing === 0) {
          status = 'completa'
        } else {
          status = 'en-progreso'
        }

        return {
          selectionId: selection.id,
          total,
          obtained: obtainedCount,
          missing,
          status,
        }
      })

      const completedSelections = selectionStats.filter((item) => item.status === 'completa').length
      const progressPercent =
        totalSelections > 0 ? Math.round((completedSelections / totalSelections) * 100) : 0

      return {
        ...user,
        issuedCount,
        placedCount,
        missingCount,
        progressPercent,
        completedSelections,
      }
    })
  }, [users, issuedStickers, placements, totalStickers, totalSelections, selections, stickersBySelection, userSelectionPhotos])

  const selectedUserIssuedIds = useMemo(() => {
    return new Set(
      issuedStickers.filter((item) => item.user_id === selectedUserId).map((item) => item.sticker_id)
    )
  }, [issuedStickers, selectedUserId])

  const selectedUserPlacedIds = useMemo(() => {
    return new Set(
      placements.filter((item) => item.user_id === selectedUserId).map((item) => item.sticker_id)
    )
  }, [placements, selectedUserId])

  const selectedUserSelectionProgress = useMemo(() => {
    return selections.map((selection) => {
      if (isIntroSelection(selection)) {
        const completed = userSelectionPhotos.some(
          (photo) =>
            photo.user_id === selectedUserId &&
            photo.selection_id === selection.id &&
            Boolean(photo.photo_url)
        )

        return {
          selection,
          total: 1,
          placedCount: completed ? 1 : 0,
          missing: completed ? 0 : 1,
          percent: completed ? 100 : 0,
        }
      }

      const selectionStickers = stickers.filter((sticker) => sticker.selection_id === selection.id)
      const total = selectionStickers.length
      const placedCount = selectionStickers.filter((sticker) => selectedUserPlacedIds.has(sticker.id)).length
      const missing = total - placedCount
      const percent = total > 0 ? Math.round((placedCount / total) * 100) : 0

      return {
        selection,
        total,
        placedCount,
        missing,
        percent,
      }
    })
  }, [selections, stickers, selectedUserPlacedIds, selectedUserId, userSelectionPhotos])

  const missingStickersForSelectedUser = useMemo(() => {
    return stickers.filter((sticker) => !selectedUserPlacedIds.has(sticker.id))
  }, [stickers, selectedUserPlacedIds])

  const recentPackHistory = useMemo(() => {
    return packs.slice(0, 12).map((pack) => {
      const packUser = users.find((user) => user.id === pack.user_id)
      const packItems = issuedStickers.filter((item) => item.pack_id === pack.id)
      const labels = Array.from(
        new Set(
          packItems
            .map((item) => stickerById[item.sticker_id]?.sticker_number)
            .filter((num): num is number => typeof num === 'number')
        )
      )
        .map((num) => `#${num}`)
        .join(', ')

      return {
        ...pack,
        userEmail: packUser?.email || 'Usuario',
        itemCount: new Set(packItems.map((item) => item.sticker_id)).size,
        labels: labels || 'Sin detalle',
      }
    })
  }, [packs, users, issuedStickers, stickerById])

  async function refreshAfterAction(message?: string) {
    await loadAdminData(tenantId)
    if (message) setGlobalMessage(message)
  }

  async function handleRefresh() {
    setGlobalMessage('')
    await loadAdminData(tenantId)
  }

  async function handleCreateUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreatingUser(true)
    setCreateUserMessage('')

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          full_name: newUserName,
          tenant_id: tenantId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCreateUserMessage(data.error || 'No fue posible crear el usuario.')
        return
      }

      setCreateUserMessage('Usuario creado correctamente.')
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      await refreshAfterAction('Usuario creado correctamente.')
    } catch (error) {
      console.error(error)
      setCreateUserMessage('Error inesperado al crear el usuario.')
    } finally {
      setCreatingUser(false)
    }
  }

  async function sendPackToUser(userId: string, size: number) {
    const user = users.find((item) => item.id === userId)
    if (!user || !user.tenant_id) {
      setGlobalMessage('No se encontró el usuario o no tiene tenant asignado.')
      return
    }

    const alreadyIssuedIds = new Set(
      issuedStickers.filter((item) => item.user_id === userId).map((item) => item.sticker_id)
    )

    const availableStickers = stickers.filter((sticker) => !alreadyIssuedIds.has(sticker.id))

    if (availableStickers.length === 0) {
      setGlobalMessage(`El usuario ${user.email} ya tiene todas las láminas emitidas.`)
      return
    }

    const selectedPackStickers = randomPickWithoutDuplicates(
      availableStickers,
      Math.min(size, availableStickers.length)
    )

    const { data: packData, error: packError } = await supabase
      .from('sticker_packs')
      .insert([
        {
          user_id: userId,
          tenant_id: user.tenant_id,
        },
      ])
      .select()
      .single()

    if (packError || !packData) {
      setGlobalMessage(`No fue posible crear el sobre: ${packError?.message || 'sin detalle'}`)
      return
    }

    const items = selectedPackStickers.map((sticker) => ({
      user_id: userId,
      sticker_id: sticker.id,
      pack_id: packData.id,
    }))

    const { error: insertError } = await supabase
      .from('issued_stickers')
      .insert(items)

    if (insertError) {
      setGlobalMessage(`No fue posible enviar el sobre: ${insertError.message}`)
      return
    }

    const numbers = selectedPackStickers.map((sticker) => `#${sticker.sticker_number}`).join(', ')
    await refreshAfterAction(`Sobre enviado a ${user.email} con ${selectedPackStickers.length} láminas: ${numbers}`)
  }

  async function handleSendSinglePack() {
    if (!selectedUserId) {
      setGlobalMessage('Selecciona un usuario.')
      return
    }

    setLoadingAction(true)
    try {
      await sendPackToUser(selectedUserId, Number(packSize))
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleSendPackToAllUsers() {
    setSendingAllUsers(true)
    setGlobalMessage('')

    try {
      for (const user of users) {
        await sendPackToUser(user.id, Number(packSize))
      }
      await refreshAfterAction('Se enviaron sobres a todos los usuarios del tenant.')
    } catch (error) {
      console.error(error)
      setGlobalMessage('Ocurrió un error enviando sobres masivos.')
    } finally {
      setSendingAllUsers(false)
    }
  }

  async function handleDeleteUser(userId: string) {
    const targetUser = users.find((user) => user.id === userId)
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar al usuario ${targetUser?.email || ''}? Esta acción no se puede deshacer.`
    )

    if (!confirmed) return

    setLoadingAction(true)
    try {
      const userPackIds = packs.filter((pack) => pack.user_id === userId).map((pack) => pack.id)

      const { error: placementsError } = await supabase
        .from('user_sticker_placements')
        .delete()
        .eq('user_id', userId)

      if (placementsError) throw placementsError

      const { error: photosError } = await supabase
        .from(USER_PHOTOS_TABLE)
        .delete()
        .eq('user_id', userId)

      if (photosError) throw photosError

      const { error: issuedError } = await supabase
        .from('issued_stickers')
        .delete()
        .eq('user_id', userId)

      if (issuedError) throw issuedError

      if (userPackIds.length > 0) {
        const { error: packsError } = await supabase
          .from('sticker_packs')
          .delete()
          .in('id', userPackIds)

        if (packsError) throw packsError
      }

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('tenant_id', tenantId)

      if (userError) throw userError

      if (selectedUserId === userId) {
        setSelectedUserId('')
      }

      await refreshAfterAction('Usuario eliminado correctamente.')
    } catch (error) {
      console.error(error)
      setGlobalMessage('No fue posible eliminar el usuario.')
    } finally {
      setLoadingAction(false)
    }
  }

  async function handleResetUserAlbum() {
    if (!selectedUserId || !selectedUser) {
      setGlobalMessage('Selecciona un usuario para reiniciar su álbum.')
      return
    }

    const confirmed = window.confirm(
      `Vas a reiniciar el álbum de ${selectedUser.email}. Se eliminarán sobres enviados, pegados y foto de selección del usuario.`
    )

    if (!confirmed) return

    setLoadingAction(true)
    try {
      const userPackIds = packs.filter((pack) => pack.user_id === selectedUserId).map((pack) => pack.id)

      const { error: placementsError } = await supabase
        .from('user_sticker_placements')
        .delete()
        .eq('user_id', selectedUserId)

      if (placementsError) throw placementsError

      const { error: photosError } = await supabase
        .from(USER_PHOTOS_TABLE)
        .delete()
        .eq('user_id', selectedUserId)

      if (photosError) throw photosError

      const { error: issuedError } = await supabase
        .from('issued_stickers')
        .delete()
        .eq('user_id', selectedUserId)

      if (issuedError) throw issuedError

      if (userPackIds.length > 0) {
        const { error: packsError } = await supabase
          .from('sticker_packs')
          .delete()
          .in('id', userPackIds)

        if (packsError) throw packsError
      }

      await refreshAfterAction(`El álbum de ${selectedUser.email} fue reiniciado.`)
    } catch (error) {
      console.error(error)
      setGlobalMessage('No fue posible reiniciar el álbum del usuario.')
    } finally {
      setLoadingAction(false)
    }
  }

  if (!sessionChecked || loadingPage) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1e293b,#0f172a_55%,#020617)] p-8 text-white">
        Cargando panel administrativo...
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
                  Panel admin tipo Panini v3
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
                  Administración local del tenant
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-blue-100/90">
                  Gestiona usuarios, sobres, progreso, faltantes, historial y reinicio del álbum de tu empresa.
                </p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/20"
                >
                  Refrescar datos
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                  <div className="text-[11px] font-black uppercase tracking-wide text-blue-100">Empresa</div>
                  <div className="mt-1 text-sm font-bold">{tenantName}</div>
                  <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-blue-100">Admin</div>
                  <div className="mt-1 text-sm font-bold">{adminName}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                  <div className="text-[11px] font-black uppercase tracking-wide text-blue-100">Usuarios</div>
                  <div className="mt-1 text-2xl font-black">{totalUsers}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                  <div className="text-[11px] font-black uppercase tracking-wide text-blue-100">Láminas</div>
                  <div className="mt-1 text-2xl font-black">{totalStickers}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white">
                  <div className="text-[11px] font-black uppercase tracking-wide text-blue-100">Pegadas</div>
                  <div className="mt-1 text-2xl font-black">{totalPlaced}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-slate-950/70 px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'usuarios', label: 'Usuarios' },
                { id: 'sobres', label: 'Sobres' },
                { id: 'control', label: 'Control álbum' },
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

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Usuario en foco</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Selecciona usuario</h2>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
              >
                <option value="">Selecciona un usuario</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name ? `${user.full_name} · ${user.email}` : user.email}
                  </option>
                ))}
              </select>

              {selectedUser ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-black text-slate-900">{selectedUser.full_name || 'Usuario'}</div>
                  <div className="text-sm text-slate-600">{selectedUser.email}</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white p-2">
                      <div className="text-[10px] font-black uppercase text-slate-500">Emitidas</div>
                      <div className="mt-1 text-lg font-black text-slate-900">{selectedUserIssuedIds.size}</div>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <div className="text-[10px] font-black uppercase text-slate-500">Pegadas</div>
                      <div className="mt-1 text-lg font-black text-slate-900">{selectedUserPlacedIds.size}</div>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <div className="text-[10px] font-black uppercase text-slate-500">Faltan</div>
                      <div className="mt-1 text-lg font-black text-slate-900">
                        {Math.max(totalStickers - selectedUserPlacedIds.size, 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Sobres</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Envío rápido</h2>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Tamaño del sobre</label>
                  <select
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                    value={packSize}
                    onChange={(e) => setPackSize(e.target.value)}
                  >
                    <option value="3">3 láminas</option>
                    <option value="4">4 láminas</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={loadingAction || !selectedUserId}
                  onClick={handleSendSinglePack}
                  className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                >
                  {loadingAction ? 'Enviando...' : 'Enviar sobre al usuario'}
                </button>

                <button
                  type="button"
                  disabled={sendingAllUsers || users.length === 0}
                  onClick={handleSendPackToAllUsers}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {sendingAllUsers ? 'Enviando sobres...' : 'Enviar sobre a todos'}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Control</div>
              <h2 className="mt-2 text-xl font-black text-slate-900">Acciones de riesgo</h2>
              <p className="mt-2 text-sm text-slate-600">
                Usa esta opción solo si necesitas reiniciar el álbum completo de un usuario.
              </p>

              <button
                type="button"
                disabled={loadingAction || !selectedUserId}
                onClick={handleResetUserAlbum}
                className="mt-4 w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow transition hover:bg-red-700 disabled:opacity-50"
              >
                Reiniciar álbum del usuario
              </button>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            {activeTab === 'dashboard' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Selecciones</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{totalSelections}</div>
                  </div>
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Emitidas</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{totalIssued}</div>
                  </div>
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Pegadas</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{totalPlaced}</div>
                  </div>
                  <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Sobres</div>
                    <div className="mt-2 text-3xl font-black text-slate-900">{packs.length}</div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Progreso global</div>
                      <h2 className="mt-2 text-xl font-black text-slate-900">Avance por usuario</h2>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="pb-3 pr-4 font-black text-slate-700">Usuario</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Emitidas</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Pegadas</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Faltantes</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Selecciones completas</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Progreso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userProgressRows.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100 align-top">
                            <td className="py-3 pr-4">
                              <div className="font-bold text-slate-900">{row.full_name || 'Usuario'}</div>
                              <div className="text-slate-500">{row.email}</div>
                            </td>
                            <td className="py-3 pr-4 font-semibold text-slate-800">{row.issuedCount}</td>
                            <td className="py-3 pr-4 font-semibold text-slate-800">{row.placedCount}</td>
                            <td className="py-3 pr-4 font-semibold text-slate-800">{row.missingCount}</td>
                            <td className="py-3 pr-4 font-semibold text-slate-800">{row.completedSelections}</td>
                            <td className="py-3 pr-4">
                              <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb,#facc15)]"
                                  style={{ width: `${row.progressPercent}%` }}
                                />
                              </div>
                              <div className="text-xs font-black text-slate-700">{row.progressPercent}%</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Historial</div>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Últimos sobres enviados</h2>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {recentPackHistory.length > 0 ? (
                      recentPackHistory.map((pack) => (
                        <div key={pack.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Sobre
                          </div>
                          <div className="mt-1 text-sm font-black text-slate-900">{pack.userEmail}</div>
                          <div className="mt-2 text-sm text-slate-600">Láminas: {pack.itemCount}</div>
                          <div className="mt-1 text-sm text-slate-600">{pack.labels}</div>
                          <div className="mt-3 text-xs font-semibold text-slate-500">{formatDate(pack.created_at)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                        Aún no hay sobres registrados.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === 'usuarios' ? (
              <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Nuevo usuario</div>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Crear usuario</h2>

                  <form onSubmit={handleCreateUser} className="mt-5 space-y-4">
                    <input
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Nombre completo"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                    />
                    <input
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Correo"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                    />
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="w-full rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                    >
                      {creatingUser ? 'Creando usuario...' : 'Crear usuario'}
                    </button>
                  </form>

                  {createUserMessage ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                      {createUserMessage}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Listado</div>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Usuarios del tenant</h2>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="pb-3 pr-4 font-black text-slate-700">Nombre</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Correo</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Selecciones completas</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Pegadas</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Emitidas</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">% avance</th>
                          <th className="pb-3 pr-4 font-black text-slate-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userProgressRows.map((user) => (
                          <tr key={user.id} className="border-b border-slate-100">
                            <td className="py-3 pr-4 font-semibold text-slate-900">{user.full_name || '—'}</td>
                            <td className="py-3 pr-4 text-slate-600">{user.email}</td>
                            <td className="py-3 pr-4 font-semibold text-slate-800">{user.completedSelections}</td>
                            <td className="py-3 pr-4 font-semibold text-slate-800">{user.placedCount}</td>
                            <td className="py-3 pr-4 font-semibold text-slate-800">{user.issuedCount}</td>
                            <td className="py-3 pr-4 font-semibold text-slate-800">{user.progressPercent}%</td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserId(user.id)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-700 hover:bg-slate-50"
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  disabled={loadingAction}
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="rounded-lg bg-red-500 px-3 py-1 text-xs font-black text-white hover:bg-red-600 disabled:opacity-50"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'sobres' ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Faltantes</div>
                <h2 className="mt-2 text-xl font-black text-slate-900">
                  Láminas que le faltan al usuario seleccionado
                </h2>

                {selectedUser ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Usuario: <span className="font-bold text-slate-900">{selectedUser.email}</span>
                  </p>
                ) : null}

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {missingStickersForSelectedUser.length > 0 ? (
                    missingStickersForSelectedUser.map((sticker) => {
                      const selection = selections.find((item) => item.id === sticker.selection_id)
                      return (
                        <div key={sticker.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                            {selection?.name || 'Selección'}
                          </div>
                          <div className="mt-2 text-sm font-black text-slate-900">
                            #{sticker.sticker_number} · {sticker.name}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      Este usuario ya completó todas las láminas activas.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === 'control' ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Progreso por selección</div>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Avance detallado del usuario</h2>

                  <div className="mt-5 space-y-4">
                    {selectedUserSelectionProgress.map((row) => (
                      <div key={row.selection.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="text-sm font-black text-slate-900">{row.selection.name}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">
                              Pegadas {row.placedCount} de {row.total} · Faltan {row.missing}
                            </div>
                          </div>
                          <div className="min-w-[180px]">
                            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb,#eab308)]"
                                style={{ width: `${row.percent}%` }}
                              />
                            </div>
                            <div className="mt-1 text-right text-xs font-black text-slate-700">{row.percent}%</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Resumen</div>
                  <h2 className="mt-2 text-xl font-black text-slate-900">Estado actual</h2>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Usuario</div>
                      <div className="mt-1 text-sm font-bold text-slate-900">{selectedUser?.email || '—'}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Sobres generados</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">
                        {packs.filter((pack) => pack.user_id === selectedUserId).length}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Láminas emitidas</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">{selectedUserIssuedIds.size}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Láminas pegadas</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">{selectedUserPlacedIds.size}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Selecciones completas</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">
                        {
                          selectedUserSelectionProgress.filter(
                            (row) => row.total > 0 && row.placedCount === row.total
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}