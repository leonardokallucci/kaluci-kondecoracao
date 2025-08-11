'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type WithdrawalRow = {
  id: string;
  amount_koins: number;
  status: 'pending' | 'approved' | 'denied';
  coupon: string | null;
  note: string | null;
  created_at: string;
};

export default function ResgatarPage() {
  const [loading, setLoading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const [balance, setBalance] = useState<number>(0);
  const [rows, setRows] = useState<WithdrawalRow[]>([]);

  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [okMsg, setOkMsg] = useState<string>('');

  async function loadData() {
    setErrorMsg('');
    setOkMsg('');

    const { data: sess } = await supabase.auth.getUser();
    const u = sess?.user ?? null;

    if (!u) {
      setUserId(null);
      setUserEmail('');
      setBalance(0);
      setRows([]);
      return;
    }

    setUserId(u.id);
    setUserEmail(u.email ?? '');

    const { data: vb, error: eBal } = await supabase
      .from('v_user_balance')
      .select('koins_balance')
      .eq('user_id', u.id)
      .maybeSingle();

    if (eBal) setErrorMsg(eBal.message);
    setBalance(vb?.koins_balance ?? 0);

    const { data: ws, error: eHist } = await supabase
      .from('withdrawals')
      .select('id, amount_koins, status, coupon, note, created_at')
      .eq('user_id', u.id)
      .order('created_at', { ascending: false });

    if (eHist) {
      setErrorMsg(eHist.message);
      setRows([]);
    } else {
      setRows((ws ?? []) as WithdrawalRow[]);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setOkMsg('');

    if (!userId) {
      setErrorMsg('Você precisa estar logado para solicitar resgate.');
      return;
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErrorMsg('Informe um valor válido de Koins.');
      return;
    }
    if (amt > balance) {
      setErrorMsg('Valor maior que o saldo disponível.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: amt,
        p_note: note || null,
      });
      if (error) throw error;

      setOkMsg('Pedido de resgate enviado com sucesso! Aguarde aprovação do cupom.');
      setAmount('');
      setNote('');

      const [{ data: vb, error: e1 }, { data: ws, error: e2 }] = await Promise.all([
        supabase
          .from('v_user_balance')
          .select('koins_balance')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('withdrawals')
          .select('id, amount_koins, status, coupon, note, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (e1) setErrorMsg(e1.message);
      if (e2) setErrorMsg(e2.message);

      setBalance(vb?.koins_balance ?? 0);
      setRows((ws ?? []) as WithdrawalRow[]);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Falha ao solicitar resgate.');
    } finally {
      setLoading(false);
    }
  };

  // helpers de estilo
  const statusBadge = (s: WithdrawalRow['status']) => {
    const base =
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';
    if (s === 'approved') return `${base} bg-emerald-50 text-emerald-700 border border-emerald-200`;
    if (s === 'denied') return `${base} bg-rose-50 text-rose-700 border border-rose-200`;
    return `${base} bg-amber-50 text-amber-700 border border-amber-200`; // pending
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Resgatar Koins
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Converta seus Koins em cupom. Pedidos são aprovados pelo administrador.
        </p>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3">
          {errorMsg}
        </div>
      )}
      {okMsg && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3">
          {okMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur shadow-sm">
          <div className="p-5 md:p-6">
            {/* Top user + balance */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Usuário
                </div>
                <div className="text-sm md:text-base font-medium text-zinc-800">
                  {userEmail || '—'}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-zinc-500">
                  Saldo
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 bg-zinc-50">
                  <span className="text-lg font-semibold">{balance}</span>
                  <span className="text-xs text-zinc-500">Koins</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Quantidade a resgatar (Koins)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex.: 150"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-zinc-800 placeholder:text-zinc-400 outline-none focus:ring-4 focus:ring-black/5 focus:border-zinc-300 transition"
                />
                <div className="text-xs text-zinc-500 mt-1.5">
                  Máx.: <span className="font-medium">{balance}</span> Koins
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Observação (opcional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex.: Preciso do cupom ainda hoje"
                  className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-zinc-800 placeholder:text-zinc-400 outline-none focus:ring-4 focus:ring-black/5 focus:border-zinc-300 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !userId}
                className="w-full inline-flex items-center justify-center rounded-xl bg-zinc-900 text-white py-2.75 font-medium shadow-sm hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Enviando…' : 'Solicitar Resgate'}
              </button>
            </form>
          </div>
        </div>

        {/* History Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white/80 backdrop-blur shadow-sm">
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold">Histórico</h2>
              {rows.length > 0 && (
                <span className="text-xs text-zinc-500">
                  {rows.length} pedido{rows.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
                Nenhuma solicitação ainda.
                <br />
                Pedidos aprovados exibem o <strong>cupom</strong>. Use-o no site conforme
                combinado.
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-zinc-200 p-4 hover:bg-zinc-50/60 transition flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-800">
                          {r.amount_koins} Koins
                        </span>
                        <span className={statusBadge(r.status)}>
                          {r.status === 'approved'
                            ? 'Aprovado'
                            : r.status === 'denied'
                            ? 'Negado'
                            : 'Pendente'}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-500 mt-0.5">
                        {new Date(r.created_at).toLocaleString()}
                      </div>

                      {r.note && (
                        <div className="text-xs text-zinc-600 mt-1 line-clamp-2">
                          Obs.: {r.note}
                        </div>
                      )}
                    </div>

                    {r.coupon && (
                      <div className="shrink-0">
                        <div className="text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md">
                          {r.coupon}
                        </div>
                        <div className="text-[10px] text-emerald-600 mt-1 text-right">
                          Cupom aprovado
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
