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
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      window.location.href = '/dashboard'
    } catch (e:any) {
      setMsg(e.message)
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{maxWidth:480, margin:'0 auto'}}>
      <div className="section-title">Entrar</div>
      <div style={{marginBottom:12}}>
        <label className="text-xs">E-mail</label>
        <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div style={{marginBottom:12}}>
        <label className="text-xs">Senha</label>
        <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <button className="btn">Entrar</button>
      {msg && <div className="text-sm" style={{marginTop:12}}>{msg}</div>}
    </form>
  )
}
