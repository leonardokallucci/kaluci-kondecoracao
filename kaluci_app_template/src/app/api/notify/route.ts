import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}))
  const { type, message, to } = payload as { type?: string; message?: string; to?: string }
  const results: any = {}

  const url = process.env.WEBHOOK_URL
  if (url) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      results.webhook = { ok: r.ok, status: r.status }
    } catch (e: any) { results.webhook = { ok: false, error: e.message } }
  }

  const wToken = process.env.WHATSAPP_TOKEN
  const wPhoneId = process.env.WHATSAPP_PHONE_ID
  const wTo = to || process.env.WHATSAPP_TO
  if (wToken && wPhoneId && wTo) {
    try {
      const r = await fetch(`https://graph.facebook.com/v18.0/${wPhoneId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${wToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: wTo, type: 'text', text: { body: message || `Evento: ${type}` } })
      })
      const j = await r.json()
      results.whatsapp = { ok: r.ok, status: r.status, body: j }
    } catch (e: any) { results.whatsapp = { ok: false, error: e.message } }
  }

  return NextResponse.json({ ok: true, results })
}
