import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type UserRow = {
  id: string
  email: string
  tenant_id: string | null
  role_id: string | number | null
  full_name?: string | null
}

const ROLE_ADMIN_GENERAL = 1
const ROLE_ADMIN_LOCAL = 2
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

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Faltan variables de entorno de Supabase.' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : ''

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No se encontró sesión válida para ejecutar la eliminación.' },
        { status: 401 }
      )
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const {
      data: { user: requesterAuthUser },
      error: requesterAuthError,
    } = await supabaseUserClient.auth.getUser()

    if (requesterAuthError || !requesterAuthUser) {
      return NextResponse.json(
        { error: 'No fue posible validar el usuario autenticado.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const userId = String(body?.user_id || '').trim()
    const tenantId = String(body?.tenant_id || '').trim()

    if (!userId || !tenantId) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios para eliminar el usuario.' },
        { status: 400 }
      )
    }

    const { data: requesterUser, error: requesterUserError } = await supabaseAdmin
      .from('users')
      .select('id, email, tenant_id, role_id, full_name')
      .eq('id', requesterAuthUser.id)
      .single<UserRow>()

    if (requesterUserError || !requesterUser) {
      return NextResponse.json(
        { error: 'No fue posible validar el acceso del administrador.' },
        { status: 403 }
      )
    }

    if (!isAnyAdmin(requesterUser.role_id)) {
      return NextResponse.json(
        { error: 'Acceso restringido.' },
        { status: 403 }
      )
    }

    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('id, email, tenant_id, role_id, full_name')
      .eq('id', userId)
      .single<UserRow>()

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: 'El usuario a eliminar no existe en la tabla users.' },
        { status: 404 }
      )
    }

    if (!targetUser.tenant_id || targetUser.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'El usuario no pertenece al tenant indicado.' },
        { status: 400 }
      )
    }

    if (isAdminLocal(requesterUser.role_id) && requesterUser.tenant_id !== targetUser.tenant_id) {
      return NextResponse.json(
        { error: 'No puedes eliminar usuarios de otro tenant.' },
        { status: 403 }
      )
    }

    const { data: packRows, error: packRowsError } = await supabaseAdmin
      .from('sticker_packs')
      .select('id')
      .eq('user_id', userId)

    if (packRowsError) {
      return NextResponse.json(
        { error: `No fue posible consultar los sobres del usuario: ${packRowsError.message}` },
        { status: 500 }
      )
    }

    const packIds = (packRows || []).map((row: { id: string }) => row.id)

    const { error: placementsError } = await supabaseAdmin
      .from('user_sticker_placements')
      .delete()
      .eq('user_id', userId)

    if (placementsError) {
      return NextResponse.json(
        { error: `No fue posible eliminar los pegados del usuario: ${placementsError.message}` },
        { status: 500 }
      )
    }

    const { error: photosError } = await supabaseAdmin
      .from(USER_PHOTOS_TABLE)
      .delete()
      .eq('user_id', userId)

    if (photosError) {
      return NextResponse.json(
        { error: `No fue posible eliminar las fotos del usuario: ${photosError.message}` },
        { status: 500 }
      )
    }

    const { error: issuedError } = await supabaseAdmin
      .from('issued_stickers')
      .delete()
      .eq('user_id', userId)

    if (issuedError) {
      return NextResponse.json(
        { error: `No fue posible eliminar las láminas emitidas del usuario: ${issuedError.message}` },
        { status: 500 }
      )
    }

    if (packIds.length > 0) {
      const { error: packsError } = await supabaseAdmin
        .from('sticker_packs')
        .delete()
        .in('id', packIds)

      if (packsError) {
        return NextResponse.json(
          { error: `No fue posible eliminar los sobres del usuario: ${packsError.message}` },
          { status: 500 }
        )
      }
    }

    const { error: userTableError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
      .eq('tenant_id', tenantId)

    if (userTableError) {
      return NextResponse.json(
        { error: `No fue posible eliminar el usuario de la tabla users: ${userTableError.message}` },
        { status: 500 }
      )
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      return NextResponse.json(
        { error: `Se eliminó de las tablas, pero falló la eliminación en Auth: ${deleteAuthError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Usuario eliminado completamente.',
    })
  } catch (error) {
    console.error('delete-user-complete error', error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error inesperado al eliminar el usuario.',
      },
      { status: 500 }
    )
  }
}
