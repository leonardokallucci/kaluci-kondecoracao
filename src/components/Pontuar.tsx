'use client'
import React, { useEffect, useState } from 'react'
import { awardPoints } from '@/lib/api'
import { supabase } from '@/lib/supabaseClient'

const CRITERIA = [
  'Agilidade com Padrão',
  'Comunicação Premium',
  'Precisão de Execução',
  'Proatividade',
  'Proteção da Marca',
  'Colaboração Interna',
  'Padrão de Entrega Final',
]

export default function Pontuar() {
  const [users, setUsers] = useState<any[]>([])
  const [me, setMe] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')
  const [criterio, setCriterio] = useState(CRITERIA[0])
  const [pontos, setPontos] = useState(1)
  const [motivo, setMotivo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const u = (await supabase.auth.getUser()).data.user
      setMe(u)
      const { data } = await supabase.from('profiles').select('user_id, first_name, setor, role')
      if (mounted) setUsers(data || [])
    })()
    return () => { mounted = false }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    try {
      await awardPoints(userId, criterio, Number(pontos), motivo)
      setMsg('Bonificação registrada com sucesso!')
      setMotivo(''); setPontos(1)
    } catch (e:any) {
      setMsg(e.message)
    }
  }

  const myRole = users.find(u => u.user_id === me?.id)?.role
  const canAward = myRole === 'admin' || myRole === 'escudo'

  if (!canAward) {
    return <div className="p-4 rounded-xl" style={{background:'#FFF4CE', border:'1px solid #E6D8A2'}}>Somente Escudos ou Admin podem lançar pontos.</div>
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm">Colaborador</label>
          <select className="select mt-1" value={userId} onChange={e => setUserId(e.target.value)} required>
            <option value="">Selecione...</option>
            {users.filter(u => u.user_id !== me?.id).map(u => (
              <option key={u.user_id} value={u.user_id}>{u.first_name} — {u.setor}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm">Critério</label>
          <select className="select mt-1" value={criterio} onChange={e => setCriterio(e.target.value)}>
            {CRITERIA.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Pontos (1–10)</label>
          <input type="number" min={1} max={10} className="input mt-1" value={pontos} onChange={e => setPontos(Number(e.target.value))} />
          <p className="text-xs text-neutral-500 mt-1">Irá gerar {Number(pontos) * 5} Koins</p>
        </div>
        <div>
          <label className="text-sm">Motivo (opcional)</label>
          <input className="input mt-1" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Descreva o comportamento observado" />
        </div>
      </div>
      <button className="btn">Bonificar</button>
      {msg && <div className="text-sm mt-2">{msg}</div>}
    </form>
  )
}
