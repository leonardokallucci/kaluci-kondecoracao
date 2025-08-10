'use client'
import React, { useEffect, useState } from 'react'
import { getMyBalance, getMyWithdrawals, requestWithdrawal } from '@/src/lib/api'

export default function Resgatar() {
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [amount, setAmount] = useState(50)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  async function refresh() {
    const [b, w] = await Promise.all([getMyBalance(), getMyWithdrawals()])
    setBalance(b); setItems(w)
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await refresh()
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    try {
      await requestWithdrawal(Number(amount), note)
      setMsg('Solicitação enviada! Aguarde aprovação do Admin.')
      setNote('')
      await refresh()
    } catch (e:any) {
      setMsg(e.message)
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-6">
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-neutral-500">Saldo atual</div>
            <div className="text-2xl font-semibold">{balance?.koins_balance ?? 0} Koins</div>
          </div>
          <div>
            <label className="text-sm">Valor para resgate (Koins)</label>
            <input type="number" min={1} className="input mt-1" value={amount} onChange={e => setAmount(Number(e.target.value))} />
            <p className="text-xs text-neutral-500 mt-1">Equivale a R${amount},00</p>
          </div>
          <div>
            <label className="text-sm">Observação (opcional)</label>
            <input className="input mt-1" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: Compra de bota Everest" />
          </div>
        </div>
        <button className="btn">Solicitar</button>
        {msg && <div className="text-sm mt-2">{msg}</div>}
      </form>

      <div className="card">
        <div className="mb-2 font-semibold">Minhas Solicitações</div>
        <table className="w-full text-sm">
          <thead><tr className="text-left border-b">
            <th className="py-2">Data</th><th>Valor</th><th>Status</th><th>Cupom</th>
          </tr></thead>
          <tbody>
            {items.map(w => (
              <tr key={w.id} className="border-b">
                <td className="py-2">{new Date(w.created_at).toLocaleString()}</td>
                <td>{w.amount_koins} Koins</td>
                <td>{w.status}</td>
                <td className="font-mono text-xs">{w.coupon || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
