'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
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

type SelectionStat = {
  selectionId: string
  total: number
  obtained: number
  missing: number
  status: 'sin-laminas' | 'sin-iniciar' | 'completa' | 'en-progreso'
}

type UserSelectionPhoto = {
  id: string
  user_id: string
  selection_id: string
  tenant_id: string
  photo_url: string
  status: string | null
  created_at?: string | null
  updated_at?: string | null
}

type IntroReferenceImage = {
  src: string
  title: string
  description?: string
}

const INTRO_SELECTION_ORDER = 0
const INTRO_SELECTION_NAME = 'Indicaciones de llenado'
const USER_PHOTOS_TABLE = 'user_selection_photos'
const UPLOAD_BUCKET = 'album-uploads'

const INTRO_REFERENCE_IMAGES: IntroReferenceImage[] = [
  {
    src: '/stickers/premio1.png',
    title: 'Premio # 1',
  },
  {
    src: '/stickers/premio2.png',
    title: 'Premio # 2',
  },
  {
    src: '/stickers/premio3.png',
    title: 'Premio # 3',
  },
]

function getSelectionStatusBadge(status?: SelectionStat['status']) {
  switch (status) {
    case 'completa':
      return 'border-emerald-300 bg-emerald-100 text-emerald-800'
    case 'en-progreso':
      return 'border-amber-300 bg-amber-100 text-amber-800'
    case 'sin-iniciar':
      return 'border-slate-300 bg-slate-100 text-slate-700'
    default:
      return 'border-slate-300 bg-slate-100 text-slate-600'
  }
}

function getSelectionStatusLabel(status?: SelectionStat['status']) {
  switch (status) {
    case 'completa':
      return 'Completa'
    case 'en-progreso':
      return 'En juego'
    case 'sin-iniciar':
      return 'Sin iniciar'
    default:
      return 'Sin láminas'
  }
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M7 2h10v2h2a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5h-.2A5.99 5.99 0 0 1 13 15.91V18h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.09A5.99 5.99 0 0 1 9.2 12H9a5 5 0 0 1-5-5V5a1 1 0 0 1 1-1h2V2Zm10 4v1a3 3 0 0 0 1-2h-1Zm-10 0H6a3 3 0 0 0 1 2V6Z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5.25 3.44 10.74 8 12 4.56-1.26 8-6.75 8-12V5l-8-3Zm0 4.2 4 1.5V11c0 3.55-2.14 7.22-4 8.57-1.86-1.35-4-5.02-4-8.57V7.7l4-1.5Z" />
    </svg>
  )
}

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm4.85 5.53-.77 2.32-2.2.29-1.34-1.74.92-2.09a8.1 8.1 0 0 1 3.39 1.22ZM10.54 4.3l1.25 2.1-1.31 1.7H8.32L7.5 5.72a7.96 7.96 0 0 1 3.04-1.42ZM5.2 8.1h2.12l1.34 1.74-.82 2.36-2.2.66-1.84-1.46A8.2 8.2 0 0 1 5.2 8.1Zm1.77 8.66.76-2.36 2.2-.67 1.88 1.37V17.5l-1.92 1.3a8.1 8.1 0 0 1-2.92-2.04Zm6.9 2.06L12 17.5v-2.4l1.88-1.37 2.2.67.76 2.36a8.08 8.08 0 0 1-2.97 2.06Zm3.96-7.42-1.84 1.46-2.2-.66-.82-2.36 1.34-1.74h2.12a8.2 8.2 0 0 1 1.4 3.3Z" />
    </svg>
  )
}

function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) {
    return (
      <div className="flex h-60 w-full items-center justify-center bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] text-center text-sm font-black text-slate-500">
        Imagen no disponible
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}

export default function AlbumClient() {
  const [currentUserId, setCurrentUserId] = useState('')
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

  const [userSelectionPhotos, setUserSelectionPhotos] = useState<Record<string, UserSelectionPhoto>>({})
  const [uploadingSelectionId, setUploadingSelectionId] = useState<string | null>(null)
  const [uploadMessageBySelection, setUploadMessageBySelection] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadAlbum() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      setCurrentUserId(user.id)
      setEmail(user.email ?? '')

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id, email, tenant_id, full_name, role_id')
        .eq('id', user.id)
        .single<UserRow>()

      if (userError || !userRow || !userRow.tenant_id) {
        console.error('No se pudo resolver el tenant del usuario', userError)
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

      const { data: userSelectionPhotosData, error: userSelectionPhotosError } = await supabase
        .from(USER_PHOTOS_TABLE)
        .select('id, user_id, selection_id, tenant_id, photo_url, status, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('tenant_id', userRow.tenant_id)

      if (selectionsError) console.error('Error cargando selecciones:', selectionsError)
      if (stickersError) console.error('Error cargando stickers:', stickersError)
      if (issuedError) console.error('Error cargando stickers emitidos:', issuedError)
      if (userSelectionPhotosError) {
        console.error(`Error cargando fotos del usuario desde ${USER_PHOTOS_TABLE}:`, userSelectionPhotosError)
      }

      setSelections((selectionsData as Selection[]) || [])
      setStickers((stickersData as Sticker[]) || [])
      setIssued((issuedData as IssuedSticker[]) || [])

      const safeUserSelectionPhotos = (userSelectionPhotosData as UserSelectionPhoto[]) || []
      const photoMap = safeUserSelectionPhotos.reduce<Record<string, UserSelectionPhoto>>((acc, item) => {
        acc[item.selection_id] = item
        return acc
      }, {})

      setUserSelectionPhotos(photoMap)
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

  async function handleSelectionPhotoUpload(
    selection: Selection,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file || !currentUserId || !tenantId) return

    if (!file.type.startsWith('image/')) {
      setUploadMessageBySelection((prev) => ({
        ...prev,
        [selection.id]: 'Debes seleccionar un archivo de imagen válido.',
      }))
      event.target.value = ''
      return
    }

    try {
      setUploadingSelectionId(selection.id)
      setUploadMessageBySelection((prev) => ({
        ...prev,
        [selection.id]: 'Subiendo foto...',
      }))

      const fileExt = file.name.split('.').pop() || 'jpg'
      const filePath = `${tenantId}/${currentUserId}/${selection.id}/foto-${Date.now()}.${fileExt.toLowerCase()}`

      const { error: uploadError } = await supabase.storage
        .from(UPLOAD_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(UPLOAD_BUCKET).getPublicUrl(filePath)

      const existingRecord = userSelectionPhotos[selection.id]

      let savedPhoto: UserSelectionPhoto | null = null

      if (existingRecord?.id) {
        const { data, error } = await supabase
          .from(USER_PHOTOS_TABLE)
          .update({
            photo_url: publicUrl,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id)
          .select('id, user_id, selection_id, tenant_id, photo_url, status, created_at, updated_at')
          .single<UserSelectionPhoto>()

        if (error) throw error
        savedPhoto = data
      } else {
        const { data, error } = await supabase
          .from(USER_PHOTOS_TABLE)
          .insert({
            user_id: currentUserId,
            selection_id: selection.id,
            tenant_id: tenantId,
            photo_url: publicUrl,
            status: 'completed',
          })
          .select('id, user_id, selection_id, tenant_id, photo_url, status, created_at, updated_at')
          .single<UserSelectionPhoto>()

        if (error) throw error
        savedPhoto = data
      }

      if (savedPhoto) {
        setUserSelectionPhotos((prev) => ({
          ...prev,
          [selection.id]: savedPhoto as UserSelectionPhoto,
        }))
      }

      setUploadMessageBySelection((prev) => ({
        ...prev,
        [selection.id]: 'Foto cargada correctamente. Esta selección quedó completada.',
      }))
    } catch (error) {
      console.error('Error cargando la foto de la selección:', error)
      setUploadMessageBySelection((prev) => ({
        ...prev,
        [selection.id]:
          'No fue posible cargar la foto. Verifica la tabla user_selection_photos y el bucket album-uploads.',
      }))
    } finally {
      setUploadingSelectionId(null)
      event.target.value = ''
    }
  }

  const issuedStickerIds = useMemo(() => new Set(issued.map((i) => i.sticker_id)), [issued])

  const introSelection = useMemo(
    () =>
      selections.find(
        (selection) =>
          selection.order_index === INTRO_SELECTION_ORDER ||
          selection.name.trim().toLowerCase() === INTRO_SELECTION_NAME.toLowerCase()
      ) || null,
    [selections]
  )

  const stickersBySelection = useMemo(() => {
    return stickers.reduce<Record<string, Sticker[]>>((acc, sticker) => {
      if (!acc[sticker.selection_id]) acc[sticker.selection_id] = []
      acc[sticker.selection_id].push(sticker)
      return acc
    }, {})
  }, [stickers])

  const selectionStats = useMemo<SelectionStat[]>(() => {
    return selections.map((selection) => {
      const isIntroSelection =
        selection.id === introSelection?.id ||
        selection.order_index === INTRO_SELECTION_ORDER ||
        selection.name.trim().toLowerCase() === INTRO_SELECTION_NAME.toLowerCase()

      if (isIntroSelection) {
        const completed = Boolean(userSelectionPhotos[selection.id]?.photo_url)
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
      const obtainedCount = selectionStickers.filter((s) => issuedStickerIds.has(s.id)).length
      const missing = total - obtainedCount
      const status: SelectionStat['status'] =
        total === 0
          ? 'sin-laminas'
          : missing === total
            ? 'sin-iniciar'
            : missing === 0
              ? 'completa'
              : 'en-progreso'

      return {
        selectionId: selection.id,
        total,
        obtained: obtainedCount,
        missing,
        status,
      }
    })
  }, [selections, stickersBySelection, issuedStickerIds, introSelection, userSelectionPhotos])

  const currentSelection = selections[currentSelectionIndex] ?? null
  const isCurrentIntroSelection =
    currentSelection &&
    (currentSelection.id === introSelection?.id ||
      currentSelection.order_index === INTRO_SELECTION_ORDER ||
      currentSelection.name.trim().toLowerCase() === INTRO_SELECTION_NAME.toLowerCase())

  const currentSelectionStickers =
    currentSelection && !isCurrentIntroSelection
      ? stickersBySelection[currentSelection.id] || []
      : []

  const currentSelectionStats = currentSelection
    ? selectionStats.find((stat) => stat.selectionId === currentSelection.id)
    : null

  const canGoPrev = currentSelectionIndex > 0
  const canGoNext = currentSelectionIndex < selections.length - 1

  const totalSections = selections.length
  const completedSections = selectionStats.filter((item) => item.status === 'completa').length
  const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1d4ed8,#0f172a_42%,#020617)] p-8 text-white">
        Cargando álbum...
      </main>
    )
  }

  if (!currentSelection) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1d4ed8,#0f172a_42%,#020617)] p-8 text-white">
        No hay selecciones disponibles para este álbum.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1d4ed8,#0f172a_42%,#020617)]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-cyan-300/20 bg-slate-950/75 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(2,8,23,0.6)] backdrop-blur-xl">
              <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,rgba(37,99,235,0.95),rgba(15,23,42,0.95)_65%,rgba(6,182,212,0.7))] p-5">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

                <h1 className="relative mt-3 text-3xl font-black tracking-tight text-white">
                  Álbum HSEQ
                </h1>

                <div className="relative mt-4 space-y-2 text-sm text-blue-50">
                  <div className="flex items-center gap-2">
                    <TrophyIcon />
                    <span className="font-semibold">Empresa:</span>
                    <span className="truncate">{companyName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BallIcon />
                    <span className="font-semibold">Usuario:</span>
                    <span className="truncate">{userName || email}</span>
                  </div>
                  <p className="text-xs text-cyan-100/80">
                    <span className="font-semibold">Tenant:</span> {tenantId}
                  </p>
                </div>

                <div className="relative mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-inner">
                  <div className="mb-2 flex items-center justify-between text-sm font-bold text-white">
                    <span>Progreso del álbum</span>
                    <span>
                      {completedSections}/{totalSections}
                    </span>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-900/60 ring-1 ring-white/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#fde047,#38bdf8,#2563eb)] shadow-[0_0_16px_rgba(56,189,248,0.9)] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-full border border-yellow-300/50 bg-yellow-300/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-yellow-200">
                      Colección
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
                      {progress}% completo
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3 flex items-center gap-2 px-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-200/70">
                  <BallIcon />
                  Selecciones
                </div>

                <div className="space-y-2">
                  {selections.map((selection, index) => {
                    const isActive = index === currentSelectionIndex
                    const stats = selectionStats.find((s) => s.selectionId === selection.id)

                    return (
                      <button
                        key={selection.id}
                        onClick={() => setCurrentSelectionIndex(index)}
                        className={`group w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                          isActive
                            ? 'border-cyan-300/60 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(59,130,246,0.18),rgba(255,255,255,0.08))] shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                            : 'border-white/10 bg-white/[0.04] hover:border-cyan-300/25 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] ${
                                isActive ? 'text-cyan-200' : 'text-blue-200/60'
                              }`}
                            >
                              <ShieldIcon />
                              Selección {selection.number ?? index + 1}
                            </div>

                            <div className={`mt-1 line-clamp-2 text-sm font-black ${isActive ? 'text-white' : 'text-blue-50'}`}>
                              {selection.name}
                            </div>
                          </div>

                          <div
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                              isActive
                                ? 'bg-yellow-300 text-slate-950 shadow'
                                : 'bg-slate-800 text-cyan-100'
                            }`}
                          >
                            {stats?.missing ?? 0}
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getSelectionStatusBadge(
                              stats?.status
                            )}`}
                          >
                            {getSelectionStatusLabel(stats?.status)}
                          </span>

                          <span className="text-[11px] font-bold text-blue-200/75">
                            {stats?.obtained ?? 0}/{stats?.total ?? 0}
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
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.35)]">
              {progress === 100 ? (
                <div className="border-b border-emerald-200 bg-[linear-gradient(90deg,#ecfdf5,#dcfce7,#ecfeff)] p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-xl font-black text-emerald-800">
                        <TrophyIcon />
                        ¡Álbum completado!
                      </h2>
                      <p className="mt-1 text-sm font-medium text-emerald-700">
                        Ya puedes reclamar tu medalla virtual.
                      </p>
                    </div>

                    <button
                      onClick={handleClaimReward}
                      className="rounded-2xl bg-[linear-gradient(135deg,#16a34a,#059669)] px-4 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110"
                    >
                      Reclamar medalla
                    </button>
                  </div>

                  {rewardMessage ? (
                    <p className="mt-3 text-sm font-semibold text-emerald-800">{rewardMessage}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(135deg,#eff6ff,#ffffff_55%,#ecfeff)] p-6">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-200/40 blur-3xl" />

                <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#06b6d4)] px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white shadow">
                      <BallIcon />
                      Selección {currentSelection.number ?? currentSelectionIndex + 1} de {selections.length}
                    </div>

                    <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                      {currentSelection.name}
                    </h2>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${getSelectionStatusBadge(
                          currentSelectionStats?.status
                        )}`}
                      >
                        {getSelectionStatusLabel(currentSelectionStats?.status)}
                      </span>

                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">
                        Faltantes: {currentSelectionStats?.missing ?? 0}
                      </span>

                      <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-black text-yellow-800">
                        Progreso: {currentSelectionStats?.obtained ?? 0}/{currentSelectionStats?.total ?? 0}
                      </span>
                    </div>

                    {currentSelection.description ? (
                      <p className="mt-4 text-sm font-semibold text-slate-500">
                        {currentSelection.description}
                      </p>
                    ) : null}

                    {currentSelection.introduccion ? (
                      <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
                        {currentSelection.introduccion}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => canGoPrev && setCurrentSelectionIndex((prev) => prev - 1)}
                      disabled={!canGoPrev}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => canGoNext && setCurrentSelectionIndex((prev) => prev + 1)}
                      disabled={!canGoNext}
                      className="rounded-2xl bg-[linear-gradient(135deg,#2563eb,#06b6d4)] px-4 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isCurrentIntroSelection ? (
                  <div className="space-y-6">
                    <div className="rounded-[28px] border border-blue-200 bg-[linear-gradient(135deg,#eff6ff,#f8fafc,#ecfeff)] p-5 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">
                            <ShieldIcon />
                            Paso obligatorio
                          </div>
                          <h3 className="mt-3 text-xl font-black text-slate-900">
                            RETO IA
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            En esta selección no se entregan láminas. Todos los usuarios deben crear una foto ilustrada utilizando un GPT y subirla. Cuando lo hagan, esta selección quedará completada.
                          </p>

                          <div className="mt-4">
                            <label
                              htmlFor={`upload-${currentSelection.id}`}
                              className={`inline-flex cursor-pointer rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow transition ${
                                uploadingSelectionId === currentSelection.id
                                  ? 'bg-slate-400'
                                  : 'bg-[linear-gradient(135deg,#2563eb,#06b6d4)] hover:brightness-110'
                              }`}
                            >
                              {uploadingSelectionId === currentSelection.id ? 'Subiendo...' : 'Subir mi foto'}
                            </label>

                            <input
                              id={`upload-${currentSelection.id}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => handleSelectionPhotoUpload(currentSelection, event)}
                              disabled={uploadingSelectionId === currentSelection.id}
                            />

                            {uploadMessageBySelection[currentSelection.id] ? (
                              <p className="mt-3 text-sm font-semibold text-slate-700">
                                {uploadMessageBySelection[currentSelection.id]}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="min-w-[220px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                            Estado
                          </div>
                          <div className="mt-2 text-lg font-black text-slate-900">
                            {userSelectionPhotos[currentSelection.id]?.photo_url ? 'Completa' : 'Pendiente'}
                          </div>
                        </div>
                      </div>

                      {userSelectionPhotos[currentSelection.id]?.photo_url ? (
                        <div className="mt-6">
                          <div className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-slate-700">
                            Tu foto registrada
                          </div>
                          <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                            <ImageWithFallback
                              src={userSelectionPhotos[currentSelection.id].photo_url}
                              alt="Foto subida por el usuario"
                              className="h-auto w-full object-cover"
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <div className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
                        <BallIcon />
                        Premios a entregar
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {INTRO_REFERENCE_IMAGES.map((item) => (
                          <div
                            key={item.src}
                            className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-sm"
                          >
                            <div className="overflow-hidden border-b border-slate-200 bg-white">
                              <div className="py-2 text-center text-sm font-black text-slate-900">
                                {item.title}
                              </div>
                              <ImageWithFallback
                                src={item.src}
                                alt={item.title}
                                className="h-60 w-full object-cover"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                    {currentSelectionStickers.map((sticker) => {
                      const isObtained = issuedStickerIds.has(sticker.id)

                      return (
                        <div
                          key={sticker.id}
                          className={`group relative overflow-hidden rounded-[24px] border transition-all ${
                            isObtained
                              ? 'border-cyan-200 bg-[linear-gradient(180deg,#ffffff,#eff6ff)] shadow-[0_12px_28px_rgba(37,99,235,0.14)]'
                              : 'border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#eef2f7)] shadow-sm'
                          }`}
                        >
                          <div
                            className={`relative flex items-center justify-between px-3 py-2 ${
                              isObtained
                                ? 'bg-[linear-gradient(135deg,#0ea5e9,#2563eb,#4338ca)] text-white'
                                : 'bg-[linear-gradient(135deg,#cbd5e1,#e2e8f0)] text-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.18em]">
                              <ShieldIcon />
                              Lámina
                            </span>
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-black">
                              #{sticker.sticker_number}
                            </span>
                          </div>

                          {isObtained ? (
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_60%)]" />
                          ) : null}

                          <div className="p-3">
                            <div className="min-h-[44px] text-sm font-black text-slate-900">
                              {sticker.name}
                            </div>

                            {sticker.description ? (
                              <p className="mt-1 min-h-[32px] text-xs font-medium text-slate-600">
                                {sticker.description}
                              </p>
                            ) : (
                              <div className="mt-1 min-h-[32px]" />
                            )}

                            <div className="mt-3 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                              {isObtained ? (
                                sticker.art_asset_url ? (
                                  <ImageWithFallback
                                    src={sticker.art_asset_url}
                                    alt={sticker.name}
                                    className="h-auto w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-48 items-center justify-center text-sm font-semibold text-slate-400">
                                    Sin imagen
                                  </div>
                                )
                              ) : (
                                <div className="relative flex h-56 items-center justify-center bg-[linear-gradient(135deg,#ffffff,#e2e8f0)] text-center text-sm font-black text-slate-400">
                                  <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(45deg,transparent_25%,rgba(148,163,184,0.25)_25%,rgba(148,163,184,0.25)_50%,transparent_50%,transparent_75%,rgba(148,163,184,0.25)_75%)] [background-size:24px_24px]" />
                                  <div className="relative flex flex-col items-center gap-2">
                                    <BallIcon />
                                    Espacio vacío
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              {isObtained ? (
                                <div className="inline-flex rounded-full border border-yellow-200 bg-[linear-gradient(135deg,#fef9c3,#fde68a)] px-3 py-1 text-xs font-black uppercase tracking-wide text-yellow-900 shadow-sm">
                                  Brillante
                                </div>
                              ) : (
                                <div className="inline-flex rounded-full border border-slate-300 bg-slate-200 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
                                  Pendiente
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}