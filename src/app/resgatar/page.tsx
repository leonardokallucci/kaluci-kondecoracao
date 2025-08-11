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
    <div className="mx-auto max-w-6xl px-4 pb-16">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Resgatar Koins
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Converta seus Koins em cupom quando precisar. O pedido vai para aprovação.
        </p>
      </div>

      {/* Alertas */}
      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          {okMsg}
        </div>
      )}

      {/* Conteúdo */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card esquerdo */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {/* Header do card */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Usuário</div>
              <div className="mt-1 font-medium text-zinc-900">
                {loading ? (
                  <span className="inline-block h-4 w-40 animate-pulse rounded bg-zinc-200" />
                ) : (
                  email || '—'
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-zinc-500">
                Saldo disponível
              </div>
              <div className="mt-1">
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                  {loading ? '—' : `${balance} Koins`}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Quantidade */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Quantidade a resgatar (Koins)
              </label>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ex.: 150"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 transition focus:border-indigo-400"
              />
              <p className="mt-1 text-xs text-zinc-500">Máx.: {balance} Koins</p>
            </div>

            {/* Observação */}
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Observação (opcional)
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: Preciso do cupom hoje"
                className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-0 transition focus:border-indigo-400"
              />
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading || submitting}
              className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Enviando…' : 'Solicitar Resgate'}
            </button>
          </form>
        </div>

        {/* Card direito – Histórico */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Histórico</h2>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex animate-pulse items-center justify-between">
                  <span className="h-4 w-32 rounded bg-zinc-200" />
                  <span className="h-4 w-24 rounded bg-zinc-200" />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhuma solicitação ainda.
              <br />
              Pedidos aprovados exibem o <span className="font-medium">cupom</span>. Use-o no
              site conforme combinado.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {history.map((w) => (
                <li key={w.id} className="flex items-start justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">
                      {w.amount_koins} Koins
                    </div>
                    <div className="text-xs text-zinc-500">
                      {new Date(w.created_at).toLocaleString()}
                      {w.note ? ` • ${w.note}` : ''}
                    </div>
                    {w.coupon && w.status === 'approved' && (
                      <div className="mt-1">
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-inset ring-zinc-200">
                          {w.coupon}
                        </span>
                      </div>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[w.status]}`}
                    title={w.status}
                  >
                    {w.status === 'pending' && 'Pendente'}
                    {w.status === 'approved' && 'Aprovado'}
                    {w.status === 'denied' && 'Negado'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
