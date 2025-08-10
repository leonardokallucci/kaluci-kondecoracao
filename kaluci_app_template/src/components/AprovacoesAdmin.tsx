'use client'
import React, { useEffect, useState } from 'react'
import { getPendingWithdrawalsAdmin, approveWithdrawal, denyWithdrawal } from '@/src/lib/api'
import { genCoupon } from '@/src/lib/util'

export default function AprovacoesAdmin() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  async function refresh() {
    const rows = await getPendingWithdrawalsAdmin()
    setItems(rows)
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      await refresh()
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  async function onApprove(id: string, amount: number) {
    setMsg(null)
    try {
      const coupon = genCoupon(amount)
      // 1) Cadastre este cupom na Shoppub (uso único, valor exato)
      // 2) Confirme no banco:
      await approveWithdrawal(id, coupon)
      await refresh()
      setMsg(`Aprovado! Cupom gerado: ${coupon}`)
    } catch (e:any) {
      setMsg(e.message)
    }
  }

  async function onDeny(id: string) {
    setMsg(null)
    try {
      await denyWithdrawal(id)
      await refresh()
      setMsg('Solicitação negada.')
    } catch (e:any) {
      setMsg(e.message)
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="space-y-4">
      {msg && <div className="p-3 rounded-lg bg-green-50 border text-sm">{msg}</div>}
      <div className="card">
        <div className="mb-2 font-semibold">Solicitações Pendentes</div>
        {items.length === 0 ? <div className="text-sm text-neutral-500">Nenhuma pendência.</div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b">
              <th className="py-2">Colaborador</th><th>Valor</th><th>Solicitado em</th><th>Ações</th>
            </tr></thead>
            <tbody>
              {items.map((w:any) => (
                <tr key={w.id} className="border-b">
                  <td className="py-2">{w.profiles?.first_name || w.user_id}</td>
                  <td>{w.amount_koins}</td>
                  <td>{new Date(w.created_at).toLocaleString()}</td>
                  <td className="space-x-2">
                    <button onClick={() => onApprove(w.id, w.amount_koins)} className="px-3 py-1 rounded-lg bg-green-600 text-white">Aprovar & gerar cupom</button>
                    <button onClick={() => onDeny(w.id)} className="px-3 py-1 rounded-lg bg-red-600 text-white">Negar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
