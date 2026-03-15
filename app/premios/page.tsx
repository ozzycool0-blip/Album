'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'

type Reward = {
  id: string
  title: string
  description: string | null
  image_url: string | null
}

export default function PremiosPage() {
  const [email, setEmail] = useState('')
  const [reward, setReward] = useState<Reward | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadReward() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('rewards')
        .select('id, title, description, image_url')
        .eq('user_id', user.id)
        .maybeSingle()

      setReward(data || null)
      setLoading(false)
    }

    loadReward()
  }, [])

  if (loading) {
    return <main className="min-h-screen p-8">Cargando premios...</main>
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Premios y reconocimientos</h1>
        <p className="mt-2 text-slate-600">Usuario: {email}</p>

        {reward ? (
          <div className="mt-8">
            <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border bg-slate-50 p-6">
              {reward.image_url ? (
                <Image
                  src={reward.image_url}
                  alt={reward.title}
                  width={400}
                  height={400}
                  className="mx-auto h-auto w-full max-w-[250px] object-contain"
                />
              ) : (
                <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-full bg-yellow-100 text-6xl">
                  🏅
                </div>
              )}

              <h2 className="mt-6 text-2xl font-bold text-slate-900">{reward.title}</h2>

              {reward.description ? (
                <p className="mt-3 text-slate-600">{reward.description}</p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed bg-slate-50 p-8">
            <div className="text-5xl">🎯</div>
            <h2 className="mt-4 text-2xl font-semibold text-slate-900">
              Aún no tienes premio
            </h2>
            <p className="mt-2 text-slate-600">
              Completa tu álbum para desbloquear tu medalla virtual.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}