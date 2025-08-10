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
        setBalance(b); setRank(r)
      } catch { /* sem dados ainda */ }
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [])

  if (loading) return <div>Carregando...</div>

  return (
    <div className="grid grid-3">
      <div className="card">
        <div className="section-title">Patente Atual</div>
        <div className="text-sm muted">{rank?.patente_label || '—'}</div>
        <div className="progress" style={{marginTop:8}}><div style={{width:`${pct}%`}} /></div>
        <div className="text-xs" style={{marginTop:6}}>{pts} / {next} pontos • faltam {delta} pts</div>
      </div>
      <div className="card">
        <div className="section-title">Seus Pontos</div>
        <div className="k-stat">{pts}</div>
        <div className="text-xs">1 ponto = 5 Koins</div>
      </div>
      <div className="card">
        <div className="section-title">Seus Koins</div>
        <div className="k-stat">{balance?.koins_balance ?? 0}</div>
        <div className="text-xs">1 Koin = R$1 (Pix)</div>
      </div>
    </div>
  )
}
