import { supabase } from '@/lib/supabase/server'

type UserRow = {
  id: string
  email: string
  full_name: string | null
  tenant_id: string | null
}

type StickerRow = {
  id: string
  tenant_id: string
}

type IssuedStickerRow = {
  user_id: string
}

export default async function AdminProgressPage() {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, full_name, tenant_id')
    .order('email', { ascending: true })

  if (usersError || !users || users.length === 0) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">Dashboard de progreso</h1>
        <p className="mt-4 text-red-600">No fue posible cargar usuarios.</p>
      </main>
    )
  }

  const tenantId = users[0].tenant_id

  const tenantUsers = users.filter((u) => u.tenant_id === tenantId)

  const { data: stickers, error: stickersError } = await supabase
    .from('stickers')
    .select('id, tenant_id')
    .eq('tenant_id', tenantId)

  const { data: issued, error: issuedError } = await supabase
    .from('issued_stickers')
    .select('user_id')

  if (stickersError || issuedError) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-bold">Dashboard de progreso</h1>
        <p className="mt-4 text-red-600">Error cargando progreso.</p>
      </main>
    )
  }

  const totalStickers = (stickers as StickerRow[] | null)?.length ?? 0
  const issuedRows = (issued as IssuedStickerRow[] | null) ?? []

  const progressData = tenantUsers.map((user) => {
    const obtained = issuedRows.filter((item) => item.user_id === user.id).length
    const progress = totalStickers > 0 ? Math.round((obtained / totalStickers) * 100) : 0

    return {
      ...user,
      obtained,
      total: totalStickers,
      progress,
    }
  })

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard de progreso del álbum</h1>
        <p className="mt-2 text-slate-600">
          Visualiza el avance de los colaboradores de tu empresa.
        </p>
        <p className="mt-1 text-xs text-slate-500">Tenant: {tenantId}</p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse overflow-hidden rounded-xl border">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-3 text-left">Usuario</th>
                <th className="border p-3 text-left">Nombre</th>
                <th className="border p-3 text-center">Láminas</th>
                <th className="border p-3 text-center">Total</th>
                <th className="border p-3 text-center">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {progressData.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="border p-3">{user.email}</td>
                  <td className="border p-3">{user.full_name ?? '-'}</td>
                  <td className="border p-3 text-center">{user.obtained}</td>
                  <td className="border p-3 text-center">{user.total}</td>
                  <td className="border p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${user.progress}%` }}
                        />
                      </div>
                      <span className="w-14 text-right text-sm font-semibold">
                        {user.progress}%
                      </span>
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