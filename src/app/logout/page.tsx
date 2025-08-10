'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LogoutPage() {
  useEffect(() => { supabase.auth.signOut().then(() => { window.location.href = '/login' }) }, [])
  return <div>Saindo...</div>
}
