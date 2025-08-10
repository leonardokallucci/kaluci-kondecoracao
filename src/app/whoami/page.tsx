'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function WhoAmI() {
  const [info, setInfo] = useState<any>({})

  useEffect(() => {
    ;(async () => {
      const session = (await supabase.auth.getSession()).data.session
      const { data, error } = await supabase.from('profiles').select('user_id, first_name').limit(1)
      setInfo({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSession: !!session,
        sessionUser: session?.user?.email ?? null,
        testQueryOk: !error,
        testQueryError: error?.message ?? null,
        sampleProfile: data?.[0] ?? null
      })
    })()
  }, [])

  return (
    <pre style={{padding:16, background:'#f7f7f8', borderRadius:12, border:'1px solid #e5e7eb', overflow:'auto'}}>
      {JSON.stringify(info, null, 2)}
    </pre>
  )
}
