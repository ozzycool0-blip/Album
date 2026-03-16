'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'

type UserRow = {
  id: string
  email: string
  tenant_id: string | null
  full_name: string | null
  role_id: number | null
}

type TenantRow = {
  id: string
  name: string | null
}

type Selection = {
  id: string
  name: string
  description: string | null
  introduccion: string | null
  order_index: number | null
  number?: number | null
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
  is_active?: boolean | null
}

type IssuedSticker = {
  id: string
  user_id: string
  sticker_id: string
}

export default function AlbumClient() {
  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [selections, setSelections] = useState<Selection[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [issued, setIssued] = useState<IssuedSticker[]>([])
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [rewardMessage, setRewardMessage] = useState('')
  const [currentSelectionIndex, setCurrentSelectionIndex] = useState(0)

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
        .single<UserRow>()

      if (userError || !userRow || !userRow.tenant_id) {
        console.error('No se pudo resolver el tenant del usuario')
        setLoading(false)
        return
      }

      setTenantId(userRow.tenant_id)
      setUserName(userRow.full_name ?? user.email ?? '')

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('id', userRow.tenant_id)
        .single<TenantRow>()

      setCompanyName(tenantData?.name ?? 'Empresa')

      const { data: selectionsData, error: selectionsError } = await supabase
        .from('selections')
        .select('id, name, description, introduccion, order_index, number, tenant_id')
        .eq('tenant_id', userRow.tenant_id)
        .order('order_index', { ascending: true })

      const { data: stickersData, error: stickersError } = await supabase
        .from('stickers')
        .select('id, sticker_number, name, description, selection_id, art_asset_url, tenant_id, is_active')
        .eq('tenant_id', userRow.tenant_id)
        .eq('is_active', true)
        .order('sticker_number', { ascending: true })

      const { data: issuedData, error: issuedError } = await supabase
        .from('issued_stickers')
        .select('id, user_id, sticker_id')
        .eq('user_id', user.id)

      if (selectionsError) console.error('Error cargando selecciones:', selectionsError)
      if (stickersError) console.error('Error cargando stickers:', stickersError)
      if (issuedError) console.error('Error cargando stickers emitidos:', issuedError)

      setSelections((selectionsData as Selection[]) || [])
      setStickers((stickersData as Sticker[]) || [])
      setIssued((issuedData as IssuedSticker[]) || [])
      setCurrentSelectionIndex(0)
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

  const issuedStickerIds = useMemo(() => new Set(issued.map((i) => i.sticker_id)), [issued])

  const totalStickers = stickers.length
  const obtained = issuedStickerIds.size
  const progress = totalStickers > 0 ? Math.round((obtained / totalStickers) * 100) : 0

  const selectionStats = useMemo(() => {
    return selections.map((selection) => {
      const selectionStickers = stickers.filter((s) => s.selection_id === selection.id)
      const total = selectionStickers.length
      const obtainedCount = selectionStickers.filter((s) => issuedStickerIds.has(s.id)).length
      const missing = total - obtainedCount
      const status =
        total === 0 ? 'sin-laminas' : missing === total ? 'sin-iniciar' : missing === 0 ? 'completa' : 'en-progreso'

      return {
        selectionId: selection.id,
        total,
        obtained: obtainedCount,
        missing,
        status,
      }
    })
  }, [selections, stickers, issuedStickerIds])

  const currentSelection = selections[currentSelectionIndex] ?? null
  const currentSelectionStickers = currentSelection
    ? stickers.filter((s) => s.selection_id === currentSelection.id)
    : []

  const currentSelectionStats = currentSelection
    ? selectionStats.find((stat) => stat.selectionId === currentSelection.id)
    : null

  const canGoPrev = currentSelectionIndex > 0
  const canGoNext = currentSelectionIndex < selections.length - 1

  if (loading) {
    return <main className="min-h-screen p-8">Cargando álbum...</main>
  }

  if (!currentSelection) {
    return <main className="min-h-screen p-8">No hay selecciones disponibles para este álbum.</main>
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <h1 className="text-xl font-bold text-slate-900">Álbum HSEQ</h1>
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-semibold">Empresa:</span> {companyName}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">Usuario:</span> {email}
                </p>
                <p className="text-xs text-slate-500">
                  <span className="font-semibold">Tenant:</span> {tenantId}
                </p>

                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
                    <span>Progreso</span>
                    <span>
                      {obtained}/{totalStickers} ({progress}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                  {selections.map((selection, index) => {
                    const isActive = index === currentSelectionIndex
                    const stats = selectionStats.find((s) => s.selectionId === selection.id)

                    return (
                      <button
                        key={selection.id}
                        onClick={() => setCurrentSelectionIndex(index)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          isActive
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={`text-xs font-bold uppercase tracking-wide ${
                                isActive ? 'text-blue-700' : 'text-slate-500'
                              }`}
                            >
                              Selección {selection.number ?? index + 1}
                            </div>
                            <div
                              className={`mt-1 line-clamp-2 text-sm font-semibold ${
                                isActive ? 'text-slate-900' : 'text-slate-800'
                              }`}
                            >
                              {selection.name}
                            </div>
                          </div>

                          <div
                            className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${
                              isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {stats?.missing ?? 0}
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>Faltantes / Total</span>
                          <span>
                            {stats?.missing ?? 0} / {stats?.total ?? 0}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {progress === 100 ? (
                <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
                  <h2 className="text-lg font-bold text-green-800">¡Álbum completado!</h2>
                  <p className="mt-1 text-sm text-green-700">Ya puedes reclamar tu medalla virtual.</p>

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

              <div className="border-b border-slate-200 pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                      Selección {currentSelection.number ?? currentSelectionIndex + 1} de {selections.length}
                    </p>

                    <h2 className="mt-1 text-3xl font-bold text-slate-900">{currentSelection.name}</h2>

                    {currentSelection.description ? (
                      <p className="mt-2 text-sm text-slate-500">{currentSelection.description}</p>
                    ) : null}

                    {currentSelection.introduccion ? (
                      <p className="mt-3 max-w-4xl text-base leading-7 text-slate-700">
                        {currentSelection.introduccion}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => canGoPrev && setCurrentSelectionIndex((prev) => prev - 1)}
                      disabled={!canGoPrev}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => canGoNext && setCurrentSelectionIndex((prev) => prev + 1)}
                      disabled={!canGoNext}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>

                <div className="mt-4 inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  Láminas faltantes en esta selección:
                  <span className="ml-2 font-bold">{currentSelectionStats?.missing ?? 0}</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {currentSelectionStickers.map((sticker) => {
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

                      <div className="mt-1 min-h-[40px] text-sm font-semibold text-slate-900">
                        {sticker.name}
                      </div>

                      {sticker.description ? (
                        <p className="mt-1 min-h-[32px] text-xs text-slate-600">{sticker.description}</p>
                      ) : (
                        <div className="mt-1 min-h-[32px]" />
                      )}

                      <div className="mt-3 overflow-hidden rounded-lg border bg-white">
                        {isObtained ? (
                          sticker.art_asset_url ? (
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
                          )
                        ) : (
                          <div className="flex h-56 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-center text-sm font-medium text-slate-400">
                            Espacio vacío
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        {isObtained ? (
                          <div className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Pegada
                          </div>
                        ) : (
                          <div className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                            Pendiente
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
