import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      tenant_name,
      tenant_nit,
      total_selections,
      color_primary,
      color_secondary,
      admin_full_name,
      admin_email,
      admin_password,
    } = body

    if (!tenant_name?.trim()) {
      return NextResponse.json(
        { error: 'Falta el nombre de la empresa.' },
        { status: 400 }
      )
    }

    if (!tenant_nit?.trim()) {
      return NextResponse.json(
        { error: 'Falta el NIT de la empresa.' },
        { status: 400 }
      )
    }

    if (!total_selections || total_selections <= 0) {
      return NextResponse.json(
        { error: 'Cantidad de selecciones inválida.' },
        { status: 400 }
      )
    }

    if (!admin_full_name?.trim()) {
      return NextResponse.json(
        { error: 'Falta el nombre del administrador local.' },
        { status: 400 }
      )
    }

    if (!admin_email?.trim()) {
      return NextResponse.json(
        { error: 'Falta el correo del administrador local.' },
        { status: 400 }
      )
    }

    if (!admin_password || admin_password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener mínimo 6 caracteres.' },
        { status: 400 }
      )
    }

    /**
     * 1. Crear tenant
     */

    const { data: tenantData, error: tenantError } =
      await supabaseAdmin
        .from('tenants')
        .insert([
          {
            name: tenant_name.trim(),
            nit: tenant_nit.trim(),
            color_primary: color_primary || '#0033A0',
            color_secondary: color_secondary || '#FFD700',
          },
        ])
        .select()
        .single()

    if (tenantError || !tenantData) {
      return NextResponse.json(
        {
          error:
            tenantError?.message ||
            'No fue posible crear el tenant.',
        },
        { status: 500 }
      )
    }

    /**
     * 2. Crear selecciones iniciales
     */

    const selectionsToInsert = Array.from(
      { length: Number(total_selections) },
      (_, index) => ({
        tenant_id: tenantData.id,
        number: index + 1,
        name: `Selección ${index + 1}`,
        description: '',
        background_asset_url: null,
        color_accent: null,
        order_index: index + 1,
        introduccion: '',
      })
    )

    const { error: selectionsError } =
      await supabaseAdmin
        .from('selections')
        .insert(selectionsToInsert)

    if (selectionsError) {
      return NextResponse.json(
        {
          error:
            'Tenant creado pero falló creación de selecciones: ' +
            selectionsError.message,
        },
        { status: 500 }
      )
    }

    /**
     * 3. Crear usuario en Supabase Auth
     */

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: admin_email.trim(),
        password: admin_password,
        email_confirm: true,
      })

    if (authError || !authUser.user) {
      return NextResponse.json(
        {
          error:
            'Tenant creado pero falló creación del usuario auth: ' +
            authError?.message,
        },
        { status: 500 }
      )
    }

    /**
     * 4. Insertar admin local en tabla users
     */

    const { error: insertUserError } =
      await supabaseAdmin
        .from('users')
        .insert([
          {
            id: authUser.user.id,
            tenant_id: tenantData.id,
            email: admin_email.trim(),
            full_name: admin_full_name.trim(),
            role_id: 2,
          },
        ])

    if (insertUserError) {
      return NextResponse.json(
        {
          error:
            'Tenant creado pero falló inserción en tabla users: ' +
            insertUserError.message,
        },
        { status: 500 }
      )
    }

    /**
     * 5. Respuesta final
     */

    return NextResponse.json({
      success: true,
      tenant_id: tenantData.id,
      message:
        'Tenant, selecciones y administrador local creados correctamente.',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          'Error inesperado creando tenant completo.',
      },
      { status: 500 }
    )
  }
}