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

    // 1) sessão
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

    // 2) saldo (usa maybeSingle para não quebrar quando não houver linha)
    const { data: vb, error: eBal } = await supabase
      .from('v_user_balance')
      .select('koins_balance')
      .eq('user_id', u.id)
      .maybeSingle();

    if (eBal) {
      setErrorMsg(eBal.message);
    }
    setBalance(vb?.koins_balance ?? 0);

    // 3) histórico
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
      // chama a RPC segura (já criada no SQL)
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: amt,
        p_note: note || null,
      });
      if (error) throw error;

      setOkMsg('Pedido de resgate enviado com sucesso! Aguarde aprovação do cupom.');
      setAmount('');
      setNote('');

      // recarrega saldo + histórico
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

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold mb-4">Resgatar Koins</h1>

      {errorMsg && (
        <div className="mb-4 rounded-md bg-red-50 text-red-700 px-4 py-3 border border-red-200">
          {errorMsg}
        </div>
      )}
      {okMsg && (
        <div className="mb-4 rounded-md bg-emerald-50 text-emerald-700 px-4 py-3 border border-emerald-200">
          {okMsg}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* LADO ESQUERDO – FORM */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-zinc-500">Usuário</div>
              <div className="font-medium">{userEmail || '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-500">Saldo disponível</div>
              <div className="text-lg font-semibold">
                {balance} <span className="text-zinc-500">Koins</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-600 mb-1">
                Quantidade a resgatar (Koins)
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex.: 150"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              />
              <div className="text-xs text-zinc-500 mt-1">Máx.: {balance} Koins</div>
            </div>

            <div>
              <label className="block text-sm text-zinc-600 mb-1">
                Observação (opcional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: Preciso liberar cupom hoje"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !userId}
              className="w-full rounded-md bg-zinc-900 text-white py-2.5 font-medium disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Solicitar Resgate'}
            </button>
          </form>
        </div>

        {/* LADO DIREITO – HISTÓRICO */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Histórico</h2>

          {rows.length === 0 ? (
            <div className="text-sm text-zinc-500">
              Nenhuma solicitação ainda.
              <br />
              Pedidos aprovados exibem o <strong>cupom</strong>. Use-o no site conforme combinado.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md border border-zinc-200 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm">
                      <span className="font-medium">{r.amount_koins} Koins</span>{' '}
                      — <span className="uppercase">{r.status}</span>
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    {r.note && (
                      <div className="text-xs text-zinc-600 mt-1">Obs.: {r.note}</div>
                    )}
                  </div>
                  {r.coupon && (
                    <div className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                      {r.coupon}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
