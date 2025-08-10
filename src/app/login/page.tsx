'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMsg(error.message)
    else window.location.href = '/dashboard'
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div className="text-lg font-semibold">Entrar</div>
      <div>
        <label className="text-sm">E-mail</label>
        <input className="input mt-1" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="text-sm">Senha</label>
        <input type="password" className="input mt-1" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <button className="btn">Entrar</button>
      {msg && <div className="text-sm">{msg}</div>}
    </form>
  )
}
