'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type Withdrawal = {
  id: string;
  amount_koins: number;
  status: 'pending' | 'approved' | 'denied';
  coupon: string | null;
  note: string | null;
  created_at: string;
};

export default function ResgatarPage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Carrega sessão + saldo + histórico
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setEmail(u?.email ?? null);
        setUid(u?.id ?? null);

        // ----- SALDO -----

        let bal = 0;
        if (u?.id) {
          const { data: vb, error: ebal } = await supabase
            .from('v_user_balance')
            .select('koins_balance')
            .eq('user_id', u.id)   // FILTRA PELO USUÁRIO
            .maybeSingle();          

          if (ebal) throw ebal;
          bal = vb?.koins_balance ?? 0;
        }
        setBalance(bal);

        // ----- HISTÓRICO -----
        const { data: ws, error: ew } = await supabase
          .from('withdrawals')
          .select('id,amount_koins,status,coupon,note,created_at,user_id')
          .eq('user_id', u?.id ?? '')                // segura
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
  }, [supabase]);

  const submit = async () => {
    try {
      setErr(null);
      if (!uid) throw new Error('Faça login para solicitar.');
      const qty = Number(amount);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error('Informe uma quantidade válida.');
      if (qty > balance) throw new Error('Quantidade acima do saldo.');

      const { error: er } = await supabase.rpc('request_withdrawal', {
        p_amount: qty,
        p_note: note || null,
      });
      if (er) throw er;

      // Recarrega saldo + histórico
      const [{ data: vb }, { data: ws }] = await Promise.all([
        supabase.from('v_user_balance').select('koins_balance').eq('user_id', uid).limit(1),
        supabase.from('withdrawals')
          .select('id,amount_koins,status,coupon,note,created_at,user_id')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
      ]);

      setBalance(vb && vb.length > 0 ? (vb[0] as any).koins_balance ?? 0 : 0);
      setRows((ws || []) as Withdrawal[]);
      setAmount('');
      setNote('');
      alert('Solicitação enviada!');
    } catch (e: any) {
      setErr(e.message ?? String(e));
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Resgatar Koi</h1>

      {err && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-neutral-500">Usuário</div>
          <div className="mb-4 font-medium">{email ?? '—'}</div>

          <div className="text-sm text-neutral-500">Saldo disponível</div>
          <div className="mb-6 text-lg font-semibold">{balance} Koins</div>

          <label className="block text-sm font-medium mb-1">Quantidade a resgatar (Koins)</label>
          <input
            className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 outline-none"
            placeholder="Ex.: 150"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
          />
          <div className="mb-4 text-xs text-neutral-500">Máx.: {balance} Koins</div>

          <label className="block text-sm font-medium mb-1">Observação (opcional)</label>
          <input
            className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 outline-none"
            placeholder="Ex.: Preciso liberar cupom hoje"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button
            onClick={submit}
            disabled={loading || !uid}
            className="w-full rounded-md bg-neutral-800 px-4 py-2 text-white disabled:opacity-50"
          >
            Solicitar Resgate
          </button>
        </div>

        {/* Histórico */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold mb-3">Histórico</div>
          {rows.length === 0 ? (
            <p className="text-neutral-500">
              Nenhuma solicitação ainda. Pedidos aprovados exibem o <strong>cupom</strong>.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <li key={r.id} className="rounded-md border border-neutral-200 p-3">
                  <div className="flex justify-between">
                    <span>Koins: <strong>{r.amount_koins}</strong></span>
                    <span className="capitalize">{r.status}</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {new Date(r.created_at).toLocaleString('pt-BR')}
                  </div>
                  {r.coupon && (
                    <div className="mt-1 text-sm">
                      Cupom: <code className="rounded bg-neutral-100 px-1">{r.coupon}</code>
                    </div>
                  )}
                  {r.note && <div className="mt-1 text-sm text-neutral-600">Obs.: {r.note}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
