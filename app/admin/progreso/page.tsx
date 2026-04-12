import { supabase } from '@/lib/supabase/server'

type CurrentUserRow = {
  id: string
  email: string
  full_name: string | null
  tenant_id: string | null
  role_id?: string | number | null
}

type UserRow = {
  id: string
  email: string
  full_name: string | null
  tenant_id: string | null
}

type StickerRow = {
  id: string
  tenant_id: string
  is_active?: boolean | null
}

type PlacementRow = {
  id: string
  user_id: string
  sticker_id: string
  tenant_id: string
}

export default async function AdminProgressPage() {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">Dashboard de progreso</h1>
        <p className="mt-4 text-red-600">No fue posible validar la sesión.</p>
      </main>
    )
  }

  const { data: currentUser, error: currentUserError } = await supabase
    .from('users')
    .select('id, email, full_name, tenant_id, role_id')
    .eq('id', authUser.id)
    .single<CurrentUserRow>()

  if (currentUserError || !currentUser?.tenant_id) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">Dashboard de progreso</h1>
        <p className="mt-4 text-red-600">No fue posible resolver el tenant del usuario actual.</p>
      </main>
    )
  }

  const tenantId = currentUser.tenant_id

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, tenant_id')
    .eq('tenant_id', tenantId)
    .order('email', { ascending: true })

  if (usersError || !users) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">Dashboard de progreso</h1>
        <p className="mt-4 text-red-600">No fue posible cargar usuarios.</p>
      </main>
    )
  }

  const tenantUsers = users as UserRow[]
  const tenantUserIds = tenantUsers.map((u) => u.id)

  const { data: stickers, error: stickersError } = await supabase
    .from('stickers')
    .select('id, tenant_id, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  if (stickersError) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">Dashboard de progreso</h1>
        <p className="mt-4 text-red-600">Error cargando las láminas activas.</p>
      </main>
    )
  }

  const activeStickers = (stickers as StickerRow[] | null) ?? []
  const totalStickers = activeStickers.length

  let placementRows: PlacementRow[] = []

  if (tenantUserIds.length > 0) {
    const { data: placements, error: placementsError } = await supabase
      .from('user_sticker_placements')
      .select('id, user_id, sticker_id, tenant_id')
      .in('user_id', tenantUserIds)

    if (placementsError) {
      return (
        <main className="min-h-screen p-8">
          <h1 className="text-3xl font-bold">Dashboard de progreso</h1>
          <p className="mt-4 text-red-600">Error cargando láminas pegadas.</p>
        </main>
      )
    }

    placementRows = (placements as PlacementRow[] | null) ?? []
  }

  const progressData = tenantUsers.map((user) => {
    const placedCount = placementRows.filter((item) => item.user_id === user.id).length
    const progress = totalStickers > 0 ? Math.round((placedCount / totalStickers) * 100) : 0

    return {
      ...user,
      placedCount,
      total: totalStickers,
      progress,
    }
  })

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard de progreso del álbum</h1>
        <p className="mt-2 text-slate-600">Visualiza el avance real por láminas pegadas de los colaboradores de tu empresa.</p>
        <p className="mt-1 text-xs text-slate-500">Tenant: {tenantId}</p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl border">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-3 text-left">Usuario</th>
                <th className="border p-3 text-left">Nombre</th>
                <th className="border p-3 text-center">Pegadas</th>
                <th className="border p-3 text-center">Total</th>
                <th className="border p-3 text-center">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {progressData.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="border p-3">{user.email}</td>
                  <td className="border p-3">{user.full_name ?? '-'}</td>
                  <td className="border p-3 text-center">{user.placedCount}</td>
                  <td className="border p-3 text-center">{user.total}</td>
                  <td className="border p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${user.progress}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-sm font-semibold">{user.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
