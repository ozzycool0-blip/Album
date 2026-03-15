import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return NextResponse.json({ error: 'user_id es obligatorio' }, { status: 400 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', user_id)
      .single()

    if (userError || !userRow) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { count: totalStickers } = await supabase
      .from('stickers')
      .select('*', { count: 'exact', head: true })

    const { count: obtainedStickers } = await supabase
      .from('issued_stickers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)

    if ((obtainedStickers ?? 0) < (totalStickers ?? 0)) {
      return NextResponse.json({
        error: 'El usuario aún no completa el álbum',
      }, { status: 400 })
    }

    const { data: existingReward } = await supabase
      .from('rewards')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (existingReward) {
      return NextResponse.json({
        success: true,
        message: 'El usuario ya tenía premio',
      })
    }

    const { error: insertError } = await supabase
      .from('rewards')
      .insert([
        {
          user_id,
          tenant_id: userRow.tenant_id,
          reward_type: 'MEDAL',
          title: 'Medalla HSEQ',
          description: 'Reconocimiento por completar el álbum HSEQ.',
          image_url: null,
        },
      ])

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Medalla otorgada correctamente',
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}