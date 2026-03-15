import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { email, password, full_name, tenant_id } = body

    if (!email || !password || !full_name || !tenant_id) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios' },
        { status: 400 }
      )
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (authError) {
      return NextResponse.json(
        { error: `Error creando usuario en Auth: ${authError.message}` },
        { status: 400 }
      )
    }

    const authUserId = authData.user.id

    // 2. Crear usuario en tabla users
    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authUserId,
          tenant_id,
          email,
          full_name,
          role_id: 3, // collaborator
        },
      ])

    if (insertError) {
      return NextResponse.json(
        { error: `Error insertando usuario en tabla users: ${insertError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user_id: authUserId,
      message: 'Usuario creado correctamente',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}