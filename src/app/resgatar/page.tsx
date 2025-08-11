'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

type W = {
  id: string;
  amount_koins: number;
  status: 'pending' | 'approved' | 'denied';
  coupon: string | null;
  note: string | null;
  created_at: string;
};

export default function ResgatarPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<W[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // cores de status
  const statusClasses: Record<W['status'], string> = {
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    denied: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  };

  async function loadSession() {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionRes, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;
      const sess = sessionRes?.session;
      if (!sess?.user) {
        setEmail('');
        setUserId('');
        setBalance(0);
        setHistory([]);
        setLoading(false);
        return;
      }
      setEmail(sess.user.email ?? '');
      setUserId(sess.user.id);
      await Promise.all([loadBalance(sess.user.id), loadHistory(sess.user.id)]);
    } catch (e: any) {
      setError(e?.message ?? 'Erro inesperado ao carregar sessão.');
    } finally {
      setLoading(false);
    }
  }

  // pega saldo (view v_user_balance)
  async function loadBalance(uid: string) {
    const { data, error } = await supabase
      .from('v_user_balance')
      .select('koins_balance')
      .eq('user_id', uid)
      .maybeSingle(); // evita "JSON object requested" quando não há linha

    if (error) {
      // se a view ainda não tem linha, considera 0
      if (error.code) {
        setBalance(0);
      } else {
        setError('Falha ao buscar saldo.');
      }
      return;
    }
    setBalance(data?.koins_balance ?? 0);
  }

  // histórico simples
  async function loadHistory(uid: string) {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('id, amount_koins, status, coupon, note, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      setError('Falha ao carregar histórico.');
      return;
    }
    setHistory(data ?? []);
  }

  // submit para solicitar resgate
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    const a = Number(amount);
    if (!a || a <= 0) {
      setError('Informe um valor válido de Koins.');
      return;
    }
    if (a > balance) {
      setError('Valor solicitado é maior que seu saldo disponível.');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: a,
        p_note: note || null,
      });
      if (error) throw error;

      setOkMsg('Solicitação enviada com sucesso! Aguarde aprovação do administrador.');
      setAmount('');
      setNote('');
      await Promise.all([loadBalance(userId), loadHistory(userId)]);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível enviar a solicitação.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
