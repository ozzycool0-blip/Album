import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Falta NEXT_PUBLIC_SUPABASE_URL' },
        { status: 500 }
      )
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Falta SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const { email, password, full_name, tenant_id } = body

    if (!email || !password || !full_name || !tenant_id) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios' },
        { status: 400 }
      )
    }

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

    const { error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authUserId,
          tenant_id,
          email,
          full_name,
          role_id: 3,
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
    console.error(error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}