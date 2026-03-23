'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'

type UserRow = {
  id: string
  email: string
  tenant_id: string | null
  full_name: string | null
  role_id: number | null
}

type Selection = {
  id: string
  name: string
  description: string | null
  order_index: number | null
  tenant_id: string
}

type Sticker = {
  id: string
  sticker_number: number
  name: string
  description: string | null
  selection_id: string
  art_asset_url: string | null
  tenant_id: string
}

type IssuedSticker = {
  id: string
  user_id: string
  sticker_id: string
}

export default function AlbumClient() {
  const [email, setEmail] = useState('')
  const [selections, setSelections] = useState<Selection[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [issued, setIssued] = useState<IssuedSticker[]>([])
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [rewardMessage, setRewardMessage] = useState('')

  useEffect(() => {
    async function loadAlbum() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      setEmail(user.email ?? '')

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id, email, tenant_id, full_name, role_id')
        .eq('id', user.id)
        .single()

      if (userError || !userRow || !userRow.tenant_id) {
        console.error('No se pudo resolver el tenant del usuario')
        setLoading(false)
        return
      }

      setTenantId(userRow.tenant_id)

      const { data: selectionsData } = await supabase
        .from('selections')
        .select('id, name, description, order_index, tenant_id')
        .eq('tenant_id', userRow.tenant_id)
        .order('order_index', { ascending: true })

      const { data: stickersData } = await supabase
        .from('stickers')
        .select('id, sticker_number, name, description, selection_id, art_asset_url, tenant_id')
        .eq('tenant_id', userRow.tenant_id)
        .order('sticker_number', { ascending: true })

      const { data: issuedData } = await supabase
        .from('issued_stickers')
        .select('id, user_id, sticker_id')
        .eq('user_id', user.id)

      setSelections(selectionsData || [])
      setStickers(stickersData || [])
      setIssued(issuedData || [])
      setLoading(false)
    }

    loadAlbum()
  }, [])

  async function handleClaimReward() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const res = await fetch('/api/rewards/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    })

    const data = await res.json()

    if (!res.ok) {
      setRewardMessage(data.error || 'No fue posible reclamar el premio')
      return
    }

    setRewardMessage(data.message || 'Premio otorgado')
    window.location.href = '/premios'
  }

  if (loading) {
    return <main className="min-h-screen p-8">Cargando álbum...</main>
  }

  const issuedStickerIds = new Set(issued.map((i) => i.sticker_id))
  const totalStickers = stickers.length
  const obtained = issuedStickerIds.size
  const progress = totalStickers > 0 ? Math.round((obtained / totalStickers) * 100) : 0

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Álbum HSEQ Consulram</h1>
          <p className="mt-2 text-slate-600">Usuario: {email}</p>
          <p className="mt-1 text-xs text-slate-500">Tenant: {tenantId}</p>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Progreso</span>
              <span>
                {obtained} / {totalStickers} ({progress}%)
              </span>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {progress === 100 ? (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <h2 className="text-lg font-bold text-green-800">¡Álbum completado!</h2>
              <p className="mt-1 text-sm text-green-700">
                Ya puedes reclamar tu medalla virtual.
              </p>

              <button
                onClick={handleClaimReward}
                className="mt-4 rounded-md bg-green-600 px-4 py-2 text-white"
              >
                Reclamar medalla
              </button>

              {rewardMessage ? (
                <p className="mt-3 text-sm text-green-800">{rewardMessage}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-8 space-y-8">
          {selections.map((selection) => {
            const selectionStickers = stickers.filter((s) => s.selection_id === selection.id)

            return (
              <section key={selection.id} className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">{selection.name}</h2>

                {selection.description ? (
                  <p className="mt-2 text-sm text-slate-600">{selection.description}</p>
                ) : null}

                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {selectionStickers.map((sticker) => {
                    const isObtained = issuedStickerIds.has(sticker.id)

                    return (
                      <div
                        key={sticker.id}
                        className={`rounded-xl border p-3 shadow-sm ${
                          isObtained
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-dashed border-slate-300 bg-slate-100'
                        }`}
                      >
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Lámina #{sticker.sticker_number}
                        </div>

                        {isObtained ? (
                          <>
                            <div className="overflow-hidden rounded-lg border bg-white">
                              {sticker.art_asset_url ? (
                                <Image
                                  src={sticker.art_asset_url}
                                  alt={sticker.name}
                                  width={300}
                                  height={400}
                                  className="h-auto w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                                  Sin imagen
                                </div>
                              )}
                            </div>

                            <div className="mt-3 text-sm font-semibold text-slate-900">
                              {sticker.name}
                            </div>

                            <div className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Pegada
                            </div>
                          </>
                        ) : (
                          <div className="flex h-56 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-center text-sm font-medium text-slate-400">
                            Espacio vacío
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}