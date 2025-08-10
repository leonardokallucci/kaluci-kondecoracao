'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ColaboradoresAdmin() {
  const [list, setList] = useState<any[]>([])
  const [firstName, setFirstName] = useState('')
  const [setor, setSetor] = useState('')
  const [role, setRole] = useState<'colaborador'|'escudo'|'admin'>('colaborador')
  const [userId, setUserId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  async function refresh() {
    const { data } = await supabase.from('profiles').select('user_id, first_name, setor, role').order('first_name')
    setList(data || [])
  }

  useEffect(() => { refresh() }, [])

  async function upsert(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    try {
      const { error } = await supabase.rpc('upsert_profile', {
        p_user_id: userId,
        p_first_name: firstName,
        p_setor: setor,
        p_role: role
      })
      if (error) throw error
      setMsg('Colaborador cadastrado/atualizado.')
      setFirstName(''); setSetor(''); setRole('colaborador'); setUserId('')
      await refresh()
    } catch (e:any) { setMsg(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="mb-2 font-semibold">Lista de Colaboradores</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">Nome</th><th>Setor</th><th>Perfil</th><th>UUID (auth)</th>
          </tr></thead>
          <tbody>
            {list.map(u => (
              <tr key={u.user_id} className="border-b">
                <td className="py-2">{u.first_name}</td>
                <td>{u.setor}</td>
                <td>{u.role}</td>
                <td className="font-mono text-xs">{u.user_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form className="card space-y-3" onSubmit={upsert}>
        <div className="font-semibold">Cadastrar/Atualizar Colaborador</div>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm">UUID (auth.users)</label>
            <input required className="input font-mono text-xs mt-1" value={userId} onChange={e => setUserId(e.target.value)} placeholder="Cole o UUID copiado do Supabase" />
          </div>
          <div>
            <label className="text-sm">Primeiro Nome</label>
            <input required className="input mt-1" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ex.: Maria" />
          </div>
          <div>
            <label className="text-sm">Função/Setor</label>
            <input required className="input mt-1" value={setor} onChange={e => setSetor(e.target.value)} placeholder="Ex.: SAC e Pós Vendas" />
          </div>
          <div>
            <label className="text-sm">Perfil</label>
            <select className="select mt-1" value={role} onChange={e => setRole(e.target.value as any)}>
              <option value="colaborador">colaborador</option>
              <option value="escudo">escudo</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        <button className="btn">Salvar</button>
        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>
    </div>
  )
}
