import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const event = await req.json().catch(() => ({}))
  const { table, type, record, old_record } = event as any

  let message = ''
  if (table === 'bonificacoes' && type === 'INSERT' && record) {
    message = `✅ Bonificação: +${record.pontos} pts (+${record.koins} Koins) para user ${record.user_id}. Critério: ${record.criterio}.`
  }
  if (table === 'withdrawals' && type === 'INSERT' && record) {
    message = `🧾 Novo pedido de resgate: ${record.amount_koins} Koins pelo user ${record.user_id}.`
  }
  if (table === 'withdrawals' && type === 'UPDATE' && record?.status === 'approved' && old_record?.status !== 'approved') {
    message = `🎟️ Resgate aprovado: ${record.amount_koins} Koins pelo user ${record.user_id}. Cupom: ${record.coupon}`
  }

  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ type: 'SUPABASE_EVENT', message, event })
    })
  } catch (e) {}

  return NextResponse.json({ ok: true })
}
