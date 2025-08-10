'use client'
import React, { useEffect, useState } from 'react'
import { getMyBalance, getMyRank } from '@/lib/api'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState<any>(null)
  const [rank, setRank] = useState<any>(null)
  const next = rank?.patente_threshold ?? 8
  const pts = balance?.pontos_total ?? 0
  const pct = Math.min(100, Math.round((pts / next) * 100))
  const delta = Math.max(0, next - pts)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [b, r] = await Promise.all([getMyBalance(), getMyRank()])
        if (!mounted) return
        setBalance(b)
        setRank(r)
      } finally {
        setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Carregando...</div>

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card title="Patente Atual">
        <div className="text-sm text-neutral-500">{rank?.patente_label || '—'}</div>
        <div className="mt-2">
          <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-full" style={{ background:'#111', width: `${pct}%` }} />
          </div>
          <div className="text-xs text-neutral-500 mt-1">{pts} / {next} pontos • faltam {delta} pts</div>
        </div>
      </Card>
      <Card title="Seus Pontos">
        <div className="text-3xl font-semibold">{pts}</div>
        <div className="text-xs text-neutral-500">1 ponto = 5 Koins</div>
      </Card>
      <Card title="Seus Koins (crédito)">
        <div className="text-3xl font-semibold">{balance?.koins_balance ?? 0}</div>
        <div className="text-xs text-neutral-500">1 Koin = R$1 (Pix)</div>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="mb-2 font-semibold">{title}</div>
      {children}
    </div>
  )
}
