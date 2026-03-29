'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
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


type SelectionTheme = {
  accent: string
  accentSoft: string
  accentSoftBorder: string
  accentText: string
  accentBadgeText: string
  accentGradient: string
  accentButton: string
  accentButtonHover: string
  accentShadow: string
  accentCard: string
  accentCardBorder: string
  accentCardShadow: string
  accentPillBg: string
  accentPillBorder: string
  accentPillText: string
  accentMutedBg: string
}

const SELECTION_THEMES: SelectionTheme[] = [
  {
    accent: '#008445',
    accentSoft: '#ecfdf5',
    accentSoftBorder: '#a7f3d0',
    accentText: 'text-emerald-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#008445,#10b981)',
    accentButton: '#008445',
    accentButtonHover: '#006b38',
    accentShadow: '0 12px 24px rgba(0,132,69,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#ecfdf5)',
    accentCardBorder: '#a7f3d0',
    accentCardShadow: '0 12px 28px rgba(0,132,69,0.14)',
    accentPillBg: '#ecfdf5',
    accentPillBorder: '#a7f3d0',
    accentPillText: '#166534',
    accentMutedBg: '#d1fae5',
  },
  {
    accent: '#dc2626',
    accentSoft: '#fef2f2',
    accentSoftBorder: '#fecaca',
    accentText: 'text-red-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#dc2626,#ef4444)',
    accentButton: '#dc2626',
    accentButtonHover: '#b91c1c',
    accentShadow: '0 12px 24px rgba(220,38,38,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#fef2f2)',
    accentCardBorder: '#fecaca',
    accentCardShadow: '0 12px 28px rgba(220,38,38,0.14)',
    accentPillBg: '#fef2f2',
    accentPillBorder: '#fecaca',
    accentPillText: '#991b1b',
    accentMutedBg: '#fee2e2',
  },
  {
    accent: '#2563eb',
    accentSoft: '#eff6ff',
    accentSoftBorder: '#bfdbfe',
    accentText: 'text-blue-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#2563eb,#3b82f6)',
    accentButton: '#2563eb',
    accentButtonHover: '#1d4ed8',
    accentShadow: '0 12px 24px rgba(37,99,235,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#eff6ff)',
    accentCardBorder: '#bfdbfe',
    accentCardShadow: '0 12px 28px rgba(37,99,235,0.14)',
    accentPillBg: '#eff6ff',
    accentPillBorder: '#bfdbfe',
    accentPillText: '#1e40af',
    accentMutedBg: '#dbeafe',
  },
  {
    accent: '#7c3aed',
    accentSoft: '#f5f3ff',
    accentSoftBorder: '#ddd6fe',
    accentText: 'text-violet-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
    accentButton: '#7c3aed',
    accentButtonHover: '#6d28d9',
    accentShadow: '0 12px 24px rgba(124,58,237,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#f5f3ff)',
    accentCardBorder: '#ddd6fe',
    accentCardShadow: '0 12px 28px rgba(124,58,237,0.14)',
    accentPillBg: '#f5f3ff',
    accentPillBorder: '#ddd6fe',
    accentPillText: '#5b21b6',
    accentMutedBg: '#ede9fe',
  },
  {
    accent: '#ea580c',
    accentSoft: '#fff7ed',
    accentSoftBorder: '#fed7aa',
    accentText: 'text-orange-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#ea580c,#f97316)',
    accentButton: '#ea580c',
    accentButtonHover: '#c2410c',
    accentShadow: '0 12px 24px rgba(234,88,12,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#fff7ed)',
    accentCardBorder: '#fed7aa',
    accentCardShadow: '0 12px 28px rgba(234,88,12,0.14)',
    accentPillBg: '#fff7ed',
    accentPillBorder: '#fed7aa',
    accentPillText: '#9a3412',
    accentMutedBg: '#ffedd5',
  },
  {
    accent: '#0891b2',
    accentSoft: '#ecfeff',
    accentSoftBorder: '#a5f3fc',
    accentText: 'text-cyan-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#0891b2,#06b6d4)',
    accentButton: '#0891b2',
    accentButtonHover: '#0e7490',
    accentShadow: '0 12px 24px rgba(8,145,178,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#ecfeff)',
    accentCardBorder: '#a5f3fc',
    accentCardShadow: '0 12px 28px rgba(8,145,178,0.14)',
    accentPillBg: '#ecfeff',
    accentPillBorder: '#a5f3fc',
    accentPillText: '#155e75',
    accentMutedBg: '#cffafe',
  },
  {
    accent: '#ca8a04',
    accentSoft: '#fefce8',
    accentSoftBorder: '#fde68a',
    accentText: 'text-yellow-800',
    accentBadgeText: 'text-slate-950',
    accentGradient: 'linear-gradient(135deg,#ca8a04,#eab308)',
    accentButton: '#ca8a04',
    accentButtonHover: '#a16207',
    accentShadow: '0 12px 24px rgba(202,138,4,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#fefce8)',
    accentCardBorder: '#fde68a',
    accentCardShadow: '0 12px 28px rgba(202,138,4,0.14)',
    accentPillBg: '#fefce8',
    accentPillBorder: '#fde68a',
    accentPillText: '#854d0e',
    accentMutedBg: '#fef9c3',
  },
  {
    accent: '#be185d',
    accentSoft: '#fdf2f8',
    accentSoftBorder: '#fbcfe8',
    accentText: 'text-pink-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#be185d,#ec4899)',
    accentButton: '#be185d',
    accentButtonHover: '#9d174d',
    accentShadow: '0 12px 24px rgba(190,24,93,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#fdf2f8)',
    accentCardBorder: '#fbcfe8',
    accentCardShadow: '0 12px 28px rgba(190,24,93,0.14)',
    accentPillBg: '#fdf2f8',
    accentPillBorder: '#fbcfe8',
    accentPillText: '#9d174d',
    accentMutedBg: '#fce7f3',
  },
  {
    accent: '#4f46e5',
    accentSoft: '#eef2ff',
    accentSoftBorder: '#c7d2fe',
    accentText: 'text-indigo-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#4f46e5,#6366f1)',
    accentButton: '#4f46e5',
    accentButtonHover: '#4338ca',
    accentShadow: '0 12px 24px rgba(79,70,229,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#eef2ff)',
    accentCardBorder: '#c7d2fe',
    accentCardShadow: '0 12px 28px rgba(79,70,229,0.14)',
    accentPillBg: '#eef2ff',
    accentPillBorder: '#c7d2fe',
    accentPillText: '#3730a3',
    accentMutedBg: '#e0e7ff',
  },
  {
    accent: '#059669',
    accentSoft: '#ecfdf5',
    accentSoftBorder: '#a7f3d0',
    accentText: 'text-emerald-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#059669,#34d399)',
    accentButton: '#059669',
    accentButtonHover: '#047857',
    accentShadow: '0 12px 24px rgba(5,150,105,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#ecfdf5)',
    accentCardBorder: '#a7f3d0',
    accentCardShadow: '0 12px 28px rgba(5,150,105,0.14)',
    accentPillBg: '#ecfdf5',
    accentPillBorder: '#a7f3d0',
    accentPillText: '#065f46',
    accentMutedBg: '#d1fae5',
  },
  {
    accent: '#9333ea',
    accentSoft: '#faf5ff',
    accentSoftBorder: '#e9d5ff',
    accentText: 'text-purple-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#9333ea,#a855f7)',
    accentButton: '#9333ea',
    accentButtonHover: '#7e22ce',
    accentShadow: '0 12px 24px rgba(147,51,234,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#faf5ff)',
    accentCardBorder: '#e9d5ff',
    accentCardShadow: '0 12px 28px rgba(147,51,234,0.14)',
    accentPillBg: '#faf5ff',
    accentPillBorder: '#e9d5ff',
    accentPillText: '#6b21a8',
    accentMutedBg: '#f3e8ff',
  },
  {
    accent: '#0f766e',
    accentSoft: '#f0fdfa',
    accentSoftBorder: '#99f6e4',
    accentText: 'text-teal-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#0f766e,#14b8a6)',
    accentButton: '#0f766e',
    accentButtonHover: '#115e59',
    accentShadow: '0 12px 24px rgba(15,118,110,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#f0fdfa)',
    accentCardBorder: '#99f6e4',
    accentCardShadow: '0 12px 28px rgba(15,118,110,0.14)',
    accentPillBg: '#f0fdfa',
    accentPillBorder: '#99f6e4',
    accentPillText: '#115e59',
    accentMutedBg: '#ccfbf1',
  },
  {
    accent: '#b45309',
    accentSoft: '#fffbeb',
    accentSoftBorder: '#fcd34d',
    accentText: 'text-amber-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#b45309,#f59e0b)',
    accentButton: '#b45309',
    accentButtonHover: '#92400e',
    accentShadow: '0 12px 24px rgba(180,83,9,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#fffbeb)',
    accentCardBorder: '#fcd34d',
    accentCardShadow: '0 12px 28px rgba(180,83,9,0.14)',
    accentPillBg: '#fffbeb',
    accentPillBorder: '#fcd34d',
    accentPillText: '#92400e',
    accentMutedBg: '#fef3c7',
  },
  {
    accent: '#334155',
    accentSoft: '#f8fafc',
    accentSoftBorder: '#cbd5e1',
    accentText: 'text-slate-800',
    accentBadgeText: 'text-white',
    accentGradient: 'linear-gradient(135deg,#334155,#64748b)',
    accentButton: '#334155',
    accentButtonHover: '#1e293b',
    accentShadow: '0 12px 24px rgba(51,65,85,0.22)',
    accentCard: 'linear-gradient(180deg,#ffffff,#f8fafc)',
    accentCardBorder: '#cbd5e1',
    accentCardShadow: '0 12px 28px rgba(51,65,85,0.14)',
    accentPillBg: '#f8fafc',
    accentPillBorder: '#cbd5e1',
    accentPillText: '#334155',
    accentMutedBg: '#e2e8f0',
  },
]

function getSelectionTheme(index: number) {
  return SELECTION_THEMES[index % SELECTION_THEMES.length]
}

function getSelectionShield(selection: Selection, index: number) {
  const selectionNumber = selection.number ?? index + 1
  return `/stickers/Escudo-Sele${selectionNumber}.png`
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

  const totalRegularStickers = useMemo(
    () =>
      stickers.filter((sticker) => {
        return sticker.selection_id !== introSelection?.id
      }).length,
    [stickers, introSelection]
  )

  const obtainedRegularStickers = useMemo(
    () =>
      stickers.filter((sticker) => {
        return sticker.selection_id !== introSelection?.id && issuedStickerIds.has(sticker.id)
      }).length,
    [stickers, introSelection, issuedStickerIds]
  )

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

  const currentSelectionTheme = getSelectionTheme(currentSelectionIndex)

  const currentSelectionShield = currentSelection
    ? getSelectionShield(currentSelection, currentSelectionIndex)
    : null

  const canGoPrev = currentSelectionIndex > 0
  const canGoNext = currentSelectionIndex < selections.length - 1

  const totalSections = selections.length
  const completedSections = selectionStats.filter((item) => item.status === 'completa').length
  const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#008445,#0f172a_42%,#020617)] p-8 text-white">
        Cargando álbum...
      </main>
    )
  }

  if (!currentSelection) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#008445,#0f172a_42%,#020617)] p-8 text-white">
        No hay selecciones disponibles para este álbum.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#008445,#0f172a_42%,#020617)]">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#008445]/30 bg-slate-950/75 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_rgba(2,8,23,0.6)] backdrop-blur-xl">
              <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,rgba(0,132,69,0.96),rgba(15,23,42,0.95)_65%,rgba(16,185,129,0.72))] p-5">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#008445]/70 to-transparent" />

                <h1 className="relative mt-3 text-3xl font-black tracking-tight text-white">
                  Álbum HSEQ
                </h1>

                <div className="relative mt-4 space-y-2 text-sm text-emerald-50">
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
                  <p className="text-xs text-emerald-100/80">
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
                      className="h-full rounded-full bg-[linear-gradient(90deg,#fde047,#34d399,#008445)] shadow-[0_0_16px_rgba(0,132,69,0.45)] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded-full border border-yellow-300/50 bg-yellow-300/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-yellow-200">
                      Colección
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                      {progress}% completo
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3 flex items-center gap-2 px-2 text-xs font-black uppercase tracking-[0.24em] text-emerald-200/70">
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
                            ? 'border-[#008445]/60 bg-[linear-gradient(135deg,rgba(0,132,69,0.24),rgba(16,185,129,0.16),rgba(255,255,255,0.08))] shadow-[0_0_20px_rgba(0,132,69,0.18)]'
                            : 'border-white/10 bg-white/[0.04] hover:border-[#008445]/25 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div
                              className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] ${
                                isActive ? 'text-emerald-200' : 'text-emerald-200/60'
                              }`}
                            >
                              <ShieldIcon />
                              Selección {selection.number ?? index + 1}
                            </div>

                            <div className={`mt-1 line-clamp-2 text-sm font-black ${isActive ? 'text-white' : 'text-emerald-50'}`}>
                              {selection.name}
                            </div>
                          </div>

                          <div
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                              isActive
                                ? 'bg-yellow-300 text-slate-950 shadow'
                                : 'bg-slate-800 text-emerald-100'
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

                          <span className="text-[11px] font-bold text-emerald-200/75">
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

              <div
                className="relative overflow-hidden border-b border-slate-200 p-6"
                style={{ background: `linear-gradient(135deg, ${currentSelectionTheme.accentSoft}, #ffffff 55%, ${currentSelectionTheme.accentSoft})` }}
              >
                <div
                  className="absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
                  style={{ backgroundColor: `${currentSelectionTheme.accent}33` }}
                />

                <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 xl:flex-1">
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] shadow"
                      style={{
                        background: currentSelectionTheme.accentGradient,
                        color: currentSelectionTheme.accentBadgeText,
                        boxShadow: currentSelectionTheme.accentShadow,
                      }}
                    >
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

                      <span
                        className="rounded-full border px-3 py-1 text-xs font-black"
                        style={{
                          borderColor: currentSelectionTheme.accentSoftBorder,
                          backgroundColor: currentSelectionTheme.accentSoft,
                          color: currentSelectionTheme.accentPillText,
                        }}
                      >
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

                  <div className="flex flex-col items-center gap-4 xl:min-w-[240px] xl:items-end">
                    <div className="flex gap-2">
                      <button
                        onClick={() => canGoPrev && setCurrentSelectionIndex((prev) => prev - 1)}
                        disabled={!canGoPrev}
                        className="rounded-2xl border px-4 py-2.5 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          borderColor: currentSelectionTheme.accentSoftBorder,
                          backgroundColor: '#ffffff',
                          color: currentSelectionTheme.accent,
                        }}
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => canGoNext && setCurrentSelectionIndex((prev) => prev + 1)}
                        disabled={!canGoNext}
                        className="rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        style={{
                          background: currentSelectionTheme.accentGradient,
                          color: currentSelectionTheme.accentBadgeText,
                          boxShadow: currentSelectionTheme.accentShadow,
                        }}
                      >
                        Siguiente
                      </button>
                    </div>

                    {!isCurrentIntroSelection && currentSelectionShield ? (
                      <div
                        className="relative h-[220px] w-[220px] overflow-hidden rounded-[24px] border p-0 shadow-sm"
                        style={{
                          borderColor: '#d4af37',
                          background: 'linear-gradient(135deg,#fffdf7,#fff8e1,#fffdf7)',
                          boxShadow:
                            '0 0 0 2px rgba(212,175,55,0.35), 0 12px 30px rgba(15,23,42,0.18)',
                        }}
                      >
                        <Image
                          src={currentSelectionShield}
                          alt={`Escudo de ${currentSelection.name}`}
                          fill
                          className="object-cover"
                          priority
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isCurrentIntroSelection ? (
                  <div className="space-y-6">
                    <div
                      className="rounded-[28px] border p-5 shadow-sm"
                      style={{
                        borderColor: currentSelectionTheme.accentSoftBorder,
                        background: `linear-gradient(135deg, ${currentSelectionTheme.accentSoft}, #f8fafc, ${currentSelectionTheme.accentSoft})`,
                      }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-3xl">
                          <div
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em]"
                            style={{
                              background: currentSelectionTheme.accentGradient,
                              color: currentSelectionTheme.accentBadgeText,
                            }}
                          >
                            <ShieldIcon />
                            Paso obligatorio
                          </div>
                          <h3 className="mt-3 text-xl font-black text-slate-900">
                            RETO IA
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            En esta selección no se entregan láminas. Todos los usuarios crear una foto ilustrada utilizando un GPT (Chatgpt,Gemini,claudeai entre otros) y subirla, una vez realices esto esta seleccion quedara completada. <span className="font-black"></span>
                          </p>

                          <div className="mt-4">
                            <label
                              htmlFor={`upload-${currentSelection.id}`}
                              className={`inline-flex cursor-pointer rounded-2xl px-4 py-2.5 text-sm font-black text-white shadow transition ${
                                uploadingSelectionId === currentSelection.id
                                  ? 'bg-slate-400'
                                  : ''
                              }`}
                              style={
                                uploadingSelectionId === currentSelection.id
                                  ? undefined
                                  : {
                                      background: currentSelectionTheme.accentGradient,
                                      color: currentSelectionTheme.accentBadgeText,
                                      boxShadow: currentSelectionTheme.accentShadow,
                                    }
                              }
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
                          <div className="mt-3 text-sm text-slate-600"></div>
                        </div>
                      </div>

                      {userSelectionPhotos[currentSelection.id]?.photo_url ? (
                        <div className="mt-6">
                          <div className="mb-2 text-sm font-black uppercase tracking-[0.16em] text-slate-700">
                            Tu foto registrada
                          </div>
                          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
                            <Image
                              src={userSelectionPhotos[currentSelection.id].photo_url}
                              alt="Foto subida por el usuario"
                              width={900}
                              height={650}
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
                      <p className="mb-5 text-sm text-slate-600">
                        <span className="font-black"></span>
                      </p>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {INTRO_REFERENCE_IMAGES.map((item) => (
                          <div
                            key={item.src}
                            className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-sm"
                          >
                            <div className="overflow-hidden border-b border-slate-200 bg-white">
                              <div className="text-center text-sm font-black text-slate-900">{item.title}</div>
                              <Image
                                src={item.src}
                                alt={item.title}
                                width={800}
                                height={600}
                                className="h-60 w-full object-cover"
                              />
                            </div>
                            <div className="p-4"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {currentSelectionStickers.map((sticker) => {
                      const isObtained = issuedStickerIds.has(sticker.id)

                      return (
                        <div
                          key={sticker.id}
                          className={`group relative overflow-hidden rounded-[24px] border transition-all ${
                            isObtained
                              ? ''
                              : 'border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#eef2f7)] shadow-sm'
                          }`}
                          style={
                            isObtained
                              ? {
                                  borderColor: currentSelectionTheme.accentCardBorder,
                                  background: currentSelectionTheme.accentCard,
                                  boxShadow: currentSelectionTheme.accentCardShadow,
                                }
                              : undefined
                          }
                        >
                          <div
                            className={`relative flex items-center justify-between px-3 py-2 ${
                              isObtained
                                ? 'text-white'
                                : 'bg-[linear-gradient(135deg,#cbd5e1,#e2e8f0)] text-slate-700'
                            }`}
                            style={isObtained ? { background: currentSelectionTheme.accentGradient, color: currentSelectionTheme.accentBadgeText } : undefined}
                          >
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em]">
                              <ShieldIcon />
                              {currentSelection.name}
                            </span>
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-black">
                              #{sticker.sticker_number}
                            </span>
                          </div>

                          {isObtained ? (
                            <div
                              className="pointer-events-none absolute inset-x-0 top-0 h-24"
                              style={{ background: `radial-gradient(circle at top, rgba(255,255,255,0.6), ${currentSelectionTheme.accent}00 60%)` }}
                            />
                          ) : null}

                          <div className="p-3">
                            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                              {isObtained ? (
                                sticker.art_asset_url ? (
                                  <Image
                                    src={sticker.art_asset_url}
                                    alt={sticker.name}
                                    width={300}
                                    height={400}
                                    className="h-[320px] w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-[320px] items-center justify-center text-sm font-semibold text-slate-400">
                                    Sin imagen
                                  </div>
                                )
                              ) : (
                                <div className="relative flex h-[320px] items-center justify-center bg-[linear-gradient(135deg,#ffffff,#e2e8f0)] text-center text-sm font-black text-slate-400">
                                  <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(45deg,transparent_25%,rgba(148,163,184,0.25)_25%,rgba(148,163,184,0.25)_50%,transparent_50%,transparent_75%,rgba(148,163,184,0.25)_75%)] [background-size:24px_24px]" />
                                  <div className="relative flex flex-col items-center gap-2">
                                    <BallIcon />
                                    Espacio vacío
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 min-h-[36px] text-xs font-black leading-snug text-slate-900">
                              {sticker.name}
                            </div>

                            {sticker.description ? (
                              <p className="mt-1 min-h-[28px] text-[11px] font-medium leading-snug text-slate-600"></p>
                            ) : (
                              <div className="mt-1 min-h-[28px]" />
                            )}

                            <div className="mt-3">
                              {isObtained ? (
                                <div className="inline-flex rounded-full border border-yellow-200 bg-[linear-gradient(135deg,#fef9c3,#fde68a)] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-yellow-900 shadow-sm">
                                  PEGADO
                                </div>
                              ) : (
                                <div className="inline-flex rounded-full border border-slate-300 bg-slate-200 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
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
