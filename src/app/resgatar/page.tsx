'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type WStatus = 'pending' | 'approved' | 'denied';

type Withdrawal = {
  id: string;
  amount_koins: number;
  status: WStatus;
  coupon: string | null;
  note: string | null;
  created_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResgatarPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [loggedEmail, setLoggedEmail] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);

  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const amountInt = useMemo(() => parseInt(amount || '0', 10) || 0, [amount]);

  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        // sessão
        const { data: { session } } = await supabase.auth.getSession();
        setLoggedEmail(session?.user?.email ?? null);

        // saldo (view v_user_balance)
        const { data: vb, error: ebal } = await supabase
          .from('v_user_balance')
          .select('koins_balance')
          .maybeSingle();
        if (ebal) throw ebal;
        setBalance(vb?.koins_balance ?? 0);

        // histórico do próprio usuário
        const { data: ws, error: ew } = await supabase
          .from('withdrawals')
          .select('id,amount_koins,status,coupon,note,created_at')
          .order('created_at', { ascending: false });
        if (ew) throw ew;
        setRows((ws || []) as Withdrawal[]);
      } catch (e: any) {
        setErr(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amountInt <= 0) return alert('Informe um valor válido (> 0).');
    if (amountInt > balance) return alert('Valor solicitado é maior que seu saldo disponível.');

    try {
      setSending(true);
      setErr(null);
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: amountInt,
        p_note: note || null,
      });
      if (error) throw error;

      // Atualiza listagens
      setAmount('');
      setNote('');
      // Recarrega rápido saldo + extrato
      const [{ data: vb }, { data: ws }] = await Promise.all([
        supabase.from('v_user_balance').select('koins_balance').maybeSingle(),
        supabase.from('withdrawals').select('id,amount_koins,status,coupon,note,created_at').order('created_at', { ascending: false }),
      ]);
      setBalance(vb?.koins_balance ?? 0);
      setRows((ws || []) as Withdrawal[]);
      alert('Solicitação enviada! Aguarde a aprovação.');
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="wrap">
      <h2>Resgatar Koins</h2>

      {err && <div className="alert error">{err}</div>}
      {loading && <div className="card">Carregando…</div>}

      {!loading && (
        <>
          <div className="grid">
            <div className="card">
              <div className="row">
                <div>
                  <div className="label">Usuário</div>
                  <div className="big">{loggedEmail || '—'}</div>
                </div>
                <div>
                  <div className="label">Saldo disponível</div>
                  <div className="big">{balance} Koins</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="form">
                <div className="field">
                  <label>Quantidade a resgatar (Koins)</label>
                  <input
                    type="number"
                    min={1}
                    max={balance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ex.: 150"
                  />
                  <small>Máx: {balance} Koins</small>
                </div>

                <div className="field">
                  <label>Observação (opcional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex.: Preciso liberar cupom hoje"
                  />
                </div>

                <button className="btn primary" disabled={sending || amountInt <= 0 || amountInt > balance}>
                  {sending ? 'Enviando…' : 'Solicitar Resgate'}
                </button>
              </form>
            </div>

            <div className="card">
              <h3>Histórico</h3>
              {rows.length === 0 ? (
                <div className="muted">Nenhuma solicitação ainda.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Quando</th>
                      <th style={{ textAlign: 'right' }}>Koins</th>
                      <th>Status</th>
                      <th>Cupom</th>
                      <th>Obs.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((w) => (
                      <tr key={w.id}>
                        <td>{new Date(w.created_at).toLocaleString('pt-BR')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{w.amount_koins}</td>
                        <td>
                          {w.status === 'pending' && <span className="pill pending">Pendente</span>}
                          {w.status === 'approved' && <span className="pill ok">Aprovado</span>}
                          {w.status === 'denied' && <span className="pill neg">Negado</span>}
                        </td>
                        <td>
                          {w.coupon ? (
                            <code className="coupon" title="Cupom aprovado">{w.coupon}</code>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td className="muted">{w.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="hint">
                Pedidos aprovados exibem o <b>cupom</b>. Use-o no site conforme combinado.
              </p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .wrap { max-width: 1100px; margin: 24px auto; padding: 0 16px; }
        h2 { margin: 0 0 12px; }
        .grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 16px; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
        .card { background:#fff; border-radius:12px; padding:16px; box-shadow:0 1px 12px rgba(0,0,0,.06); }
        .alert.error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
        .row { display:flex; justify-content:space-between; gap:16px; margin-bottom:10px; }
        .label { font-size:12px; color:#64748b; }
        .big { font-size:20px; font-weight:700; }
        .form { margin-top:8px; display:grid; gap:12px; }
        .field label { display:block; font-weight:600; margin-bottom:6px; }
        input[type="number"], input[type="text"] {
          width:100%; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px;
          outline:none;
        }
        small { color:#6b7280; }
        .btn { appearance:none; border:0; border-radius:8px; padding:10px 14px; font-weight:700; cursor:pointer; }
        .btn.primary { background:#111827; color:#fff; }
        .btn:disabled { opacity:.6; cursor:not-allowed; }
        table { width:100%; border-collapse:collapse; margin-top:6px; }
        th, td { padding:10px; border-bottom:1px solid #f1f5f9; text-align:left; }
        .muted { color:#94a3b8; }
        .pill { padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700; }
        .pill.pending { background:#fff7ed; color:#9a3412; }
        .pill.ok { background:#ecfeff; color:#0e7490; }
        .pill.neg { background:#fef2f2; color:#991b1b; }
        .coupon { background:#f1f5f9; padding:2px 6px; border-radius:6px; }
        .hint { margin-top:8px; font-size:12px; color:#64748b; }
      `}</style>
    </div>
  );
}
