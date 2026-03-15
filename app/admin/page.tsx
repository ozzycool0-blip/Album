'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type UserOption = {
  id: string
  email: string
  tenant_id: string | null
}

type StickerOption = {
  id: string
  sticker_number: number
  name: string
}

type IssuedSticker = {
  sticker_id: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserOption[]>([])
  const [stickers, setStickers] = useState<StickerOption[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [packSize, setPackSize] = useState('3')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [createUserMessage, setCreateUserMessage] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)

  async function loadData() {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) return

    const { data: currentUser } = await supabase
      .from('users')
      .select('id, email, tenant_id, role_id')
      .eq('id', authUser.id)
      .single()

    if (!currentUser?.tenant_id) return

    const { data: usersData } = await supabase
      .from('users')
      .select('id, email, tenant_id')
      .eq('tenant_id', currentUser.tenant_id)
      .order('email', { ascending: true })

    const { data: stickersData } = await supabase
      .from('stickers')
      .select('id, sticker_number, name')
      .eq('tenant_id', currentUser.tenant_id)
      .order('sticker_number', { ascending: true })

    setUsers((usersData as UserOption[]) || [])
    setStickers((stickersData as StickerOption[]) || [])
  }

  useEffect(() => {
    loadData()
  }, [])

  function shuffleArray<T>(array: T[]) {
    const copy = [...array]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  async function handleSendPack(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      if (!selectedUser) {
        setMessage('Debes seleccionar un usuario')
        setLoading(false)
        return
      }

      const user = users.find((u) => u.id === selectedUser)

      if (!user || !user.tenant_id) {
        setMessage('El usuario no tiene tenant asignado')
        setLoading(false)
        return
      }

      const size = Number(packSize)

      const { data: alreadyIssued, error: issuedError } = await supabase
        .from('issued_stickers')
        .select('sticker_id')
        .eq('user_id', selectedUser)

      if (issuedError) {
        setMessage(`Error consultando láminas ya enviadas: ${issuedError.message}`)
	setLoading(false)
        return
      }

      const issuedIds = new Set(
        ((alreadyIssued as IssuedSticker[]) || []).map((item) => item.sticker_id)
      )

      const availableStickers = stickers.filter((sticker) => !issuedIds.has(sticker.id))

      if (availableStickers.length === 0) {
        setMessage(`Este usuario ya tiene todas las láminas disponibles`)
        setLoading(false)
        return
      }

      const shuffled = shuffleArray(availableStickers)
      const selectedPackStickers = shuffled.slice(0, size)

      const { data: packData, error: packError } = await supabase
        .from('sticker_packs')
        .insert([
          {
            user_id: selectedUser,
            tenant_id: user.tenant_id,
          },
        ])
        .select()
        .single()

      if (packError || !packData) {
        setMessage(`Error creando el sobre: ${packError?.message}`)
        setLoading(false)
        return
      }

      const packItems = selectedPackStickers.map((sticker) => ({
        user_id: selectedUser,
        sticker_id: sticker.id,
        pack_id: packData.id,
      }))

      const { error: insertError } = await supabase
        .from('issued_stickers')
        .insert(packItems)

      if (insertError) {
        setMessage(`Error enviando láminas: ${insertError.message}`)
        setLoading(false)
        return
      }

const sentNumbers = selectedPackStickers.map((s) => `#${s.sticker_number}`).join(', ')
      setMessage(`Sobre enviado correctamente con ${selectedPackStickers.length} láminas: ${sentNumbers}`)
    } catch {
      setMessage(`Ocurrió un error inesperado`)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCreateUserMessage('')
    setCreatingUser(true)

    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setCreateUserMessage('No hay sesión activa')
        setCreatingUser(false)
        return
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', authUser.id)
        .single()

      const tenantId = currentUser?.tenant_id

      if (!tenantId) {
        setCreateUserMessage('No se encontró tenant_id para crear el usuario')
        setCreatingUser(false)
        return
      }

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
        setCreateUserMessage(data.error || 'Error creando usuario')
        setCreatingUser(false)
        return
      }

      setCreateUserMessage('Usuario creado correctamente')
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      await loadData()
    } catch {
      setCreateUserMessage('Error inesperado al crear usuario')
    } finally {
      setCreatingUser(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Panel Admin</h1>
          <p className="mt-2 text-slate-600">
            Crea usuarios y envía sobres de 3 o 4 láminas.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Crear nuevo usuario</h2>

          <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
            <input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-md border p-3"
            />

            <input
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="Correo"
              className="w-full rounded-md border p-3"
            />

            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full rounded-md border p-3"
            />

            <button
              type="submit"
              disabled={creatingUser}
              className="w-full rounded-md bg-blue-600 p-3 text-white disabled:opacity-50"
            >
              {creatingUser ? 'Creando usuario...' : 'Crear usuario'}
            </button>

            {createUserMessage ? (
              <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                {createUserMessage}
              </div>
            ) : null}
          </form>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Enviar sobre</h2>

          <form onSubmit={handleSendPack} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block font-medium text-slate-800">Usuario</label>
              <select
                className="w-full rounded-md border p-3"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Selecciona un usuario</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium text-slate-800">Tamaño del sobre</label>
              <select
                className="w-full rounded-md border p-3"
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
              >
                <option value="3">3 láminas</option>
                <option value="4">4 láminas</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-black p-3 text-white disabled:opacity-50"
            >
              {loading ? 'Enviando sobre...' : 'Enviar sobre'}
            </button>

            {message ? (
              <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
                {message}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </main>
  )
}