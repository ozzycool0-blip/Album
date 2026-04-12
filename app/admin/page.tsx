'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function AdminRedirectPage() {
  useEffect(() => {
    async function redirectUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        window.location.href = '/login'
        return
      }

      const { data: currentUser } = await supabase
        .from('users')
        .select('role_id')
        .eq('id', authUser.id)
        .single()

      if (currentUser?.role_id === 1) {
        window.location.href = '/admin/general'
        return
      }

      if (currentUser?.role_id === 2) {
        window.location.href = '/admin/local'
        return
      }

      window.location.href = '/album'
    }

    redirectUser()
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      Redirigiendo...
    </main>
  )
}