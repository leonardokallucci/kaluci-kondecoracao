'use client'
import React, { useEffect, useState } from 'react'
import { getRankingMensal } from '@/lib/api'

export default function Ranking() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const rows = await getRankingMensal()
      if (mounted) setItems(rows)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Carregando...</div>

  return (
    <div className="card">
      <div className="mb-2 font-semibold">Ranking Mensal</div>
      <table className="w-full text-sm">
        <thead><tr className="text-left border-b">
          <th className="py-2">#</th><th>Colaborador</th><th>Setor</th><th>Pontos (mês)</th><th>Koins (mês)</th>
        </tr></thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={row.user_id} className="border-b">
              <td className="py-2">{i + 1}</td>
              <td>{row.profile?.first_name || row.user_id}</td>
              <td>{row.profile?.setor || '-'}</td>
              <td>{row.pontos_mes}</td>
              <td>{row.koins_mes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
