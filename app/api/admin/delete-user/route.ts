import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type UserProfile = {
  id: string
  tenant_id: string | null
  email: string
  full_name?: string | null
  role_id: number | null
}

const ROLE_ADMIN_GENERAL = 1
const ROLE_ADMIN_LOCAL = 2
const ROLE_USER = 3

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const body = await req.json()
    const targetUserId = String(body?.targetUserId || '').trim()

    if (!targetUserId) {
      return NextResponse.json({ error: 'Falta targetUserId.' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Faltan variables de entorno de Supabase.' },
        { status: 500 }
      )
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const requesterClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const {
      data: { user: authUser },
      error: authError,
    } = await requesterClient.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: requesterProfile, error: requesterError } = await adminClient
      .from('users')
      .select('id, tenant_id, email, full_name, role_id')
      .eq('id', authUser.id)
      .single<UserProfile>()

    if (requesterError || !requesterProfile) {
      return NextResponse.json(
        { error: 'No fue posible validar el perfil del solicitante.' },
        { status: 403 }
      )
    }

    if (
      requesterProfile.role_id !== ROLE_ADMIN_LOCAL &&
      requesterProfile.role_id !== ROLE_ADMIN_GENERAL
    ) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar usuarios.' },
        { status: 403 }
      )
    }

    if (requesterProfile.id === targetUserId) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propio usuario desde este panel.' },
        { status: 400 }
      )
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from('users')
      .select('id, tenant_id, email, full_name, role_id')
      .eq('id', targetUserId)
      .single<UserProfile>()

    if (targetError || !targetProfile) {
      return NextResponse.json(
        { error: 'No se encontró el usuario a eliminar.' },
        { status: 404 }
      )
    }

    if (
      requesterProfile.role_id === ROLE_ADMIN_LOCAL &&
      requesterProfile.tenant_id !== targetProfile.tenant_id
    ) {
      return NextResponse.json(
        { error: 'No puedes eliminar usuarios de otro tenant.' },
        { status: 403 }
      )
    }

    if (
      requesterProfile.role_id === ROLE_ADMIN_LOCAL &&
      targetProfile.role_id !== ROLE_USER
    ) {
      return NextResponse.json(
        { error: 'El admin local solo puede eliminar usuarios finales.' },
        { status: 403 }
      )
    }

    const deleteOperations = [
      adminClient.from('user_selection_photos').delete().eq('user_id', targetUserId),
      adminClient.from('user_sticker_placements').delete().eq('user_id', targetUserId),
      adminClient.from('issued_stickers').delete().eq('user_id', targetUserId),
      adminClient.from('sticker_packs').delete().eq('user_id', targetUserId),
    ]

    const deleteResults = await Promise.all(deleteOperations)

    for (const result of deleteResults) {
      if (result.error) {
        return NextResponse.json(
          { error: `Error eliminando registros relacionados: ${result.error.message}` },
          { status: 500 }
        )
      }
    }

    const { error: deleteProfileError } = await adminClient
      .from('users')
      .delete()
      .eq('id', targetUserId)

    if (deleteProfileError) {
      return NextResponse.json(
        { error: `Error eliminando perfil: ${deleteProfileError.message}` },
        { status: 500 }
      )
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetUserId)

    if (deleteAuthError) {
      return NextResponse.json(
        {
          error:
            `El perfil en public.users fue eliminado, pero falló la eliminación en Auth: ` +
            deleteAuthError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: `Usuario ${targetProfile.email} eliminado completamente.`,
    })
  } catch (error) {
    console.error('DELETE USER ERROR:', error)
    return NextResponse.json(
      { error: 'Error inesperado eliminando el usuario.' },
      { status: 500 }
    )
  }
}