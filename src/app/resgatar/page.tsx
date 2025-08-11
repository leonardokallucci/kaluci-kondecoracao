'use client';

import { useEffect, useMemo, useState } from 'react';
import * as SupabaseModule from '@/lib/supabaseClient';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '600', '700'] });

type WithdrawalStatus = 'pending' | 'approved' | 'denied';
type Withdrawal = {
  id: string;
  amount_koins: number;
  status: WithdrawalStatus;
  coupon: string | null;
  note: string | null;
  created_at: string;
};

const chip: Record<WithdrawalStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  denied: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

// ====== helpers de estilo (cards/inputs/botões quadrados arredondados) ======
const CARD = 'rounded-2xl border border-zinc-200 bg-white shadow-sm';
const CARD_PAD = 'p-6';
const TITLE = 'text-[15px] font-semibold text-zinc-900';
const SUB = 'text-sm text-zinc-500';
const INPUT =
  'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';
const BTN_PRIMARY =
  'inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50';
const BTN_SOFT =
  'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50';

// -------- Adapter robusto para qualquer export do supabaseClient --------
function resolveSupabaseClient(): any {
  const m: any = SupabaseModule as any;
  if (m.supabase?.auth) return m.supabase;
  if (m.default?.supabase?.auth) return m.default.supabase;
  if (typeof m.createClient === 'function') {
    const c = m.createClient();
    if (c?.auth) return c;
  }
  if (typeof m.default === 'function') {
    const c = m.default();
    if (c?.auth) return c;
  }
  if (m.default?.auth) return m.default;
  if (m?.auth) return m;
  throw new Error('Não foi possível resolver o cliente Supabase. Verifique src/lib/supabaseClient.ts');
}

export default function ResgatarPage() {
  const supabase = useMemo(() => resolveSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState < Withdrawal[] > ([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState < string | null > (null);
  const [okMsg, setOkMsg] = useState < string | null > (null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const user = data?.session?.user;
      if (!user) {
        setEmail(''); setUserId(''); setBalance(0); setHistory([]);
        return;
      }
      setEmail(user.email ?? ''); setUserId(user.id);
      await Promise.all([loadBalance(user.id), loadHistory(user.id)]);
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  async function loadBalance(uid: string) {
    const { data, error } = await supabase
      .from('v_user_balance')
      .select('koins_balance')
      .eq('user_id', uid)
      .maybeSingle(); // evita “JSON object requested…”

    if (error) return setBalance(0);
    setBalance(data?.koins_balance ?? 0);
  }

  async function loadHistory(uid: string) {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('id, amount_koins, status, coupon, note, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    setHistory(error ? [] : (data ?? []));
  }

  function useMax() {
    setAmount(String(balance || ''));
  }

  async function copyCoupon(c: string) {
    try {
      await navigator.clipboard.writeText(c);
      setOkMsg('Cupom copiado!');
      setTimeout(() => setOkMsg(null), 1200);
    } catch { }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOkMsg(null);

    const a = Number(amount);
    if (!a || a <= 0) return setError('Informe um valor válido de Koins.');
    if (a > balance) return setError('Valor solicitado é maior que seu saldo disponível.');

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: a,
        p_note: note || null,
      });
      if (error) throw error;

      setOkMsg('Solicitação enviada! Aguarde aprovação.');
      setAmount(''); setNote('');
      await Promise.all([loadBalance(userId), loadHistory(userId)]);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível enviar a solicitação.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  return (
    <div className={`${jakarta.className} bg-zinc-50`}>
      <div className="mx-auto max-w-6xl px-4 pb-16">
        {/* Cabeçalho da página */}
        <div>
          <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-zinc-200 bg-zinc-50/80 px-4 py-4 backdrop-blur">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Resgatar Koins</h1>
            <p className="mt-1 text-sm text-zinc-500">Converta seus Koins em cupom. O pedido vai para aprovação.</p>
          </div>

          {/* Alerts separados em bloco */}
          {error && (
            <div role="alert" className={`${CARD} ${CARD_PAD} mb-6 border-rose-200 bg-rose-50/60`}>
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}
          {okMsg && (
            <div role="status" className={`${CARD} ${CARD_PAD} mb-6 border-emerald-200 bg-emerald-50/70`}>
              <p className="text-sm font-medium text-emerald-700">{okMsg}</p>
            </div>
          )}

          {/* Bloco 1 — Resumo (card próprio) */}
          {!loading && !userId ? (
            <div className={`${CARD} ${CARD_PAD} mb-6`}>
              <p className="text-zinc-700">
                Você não está logado. Acesse{' '}
                <a href="/login" className="font-medium text-indigo-600 hover:underline">/login</a> para continuar.
              </p>
            </div>
          ) : (
            <div className={`${CARD} ${CARD_PAD} mb-6`}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500">Usuário</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900">
                    {loading ? <span className="inline-block h-4 w-40 animate-pulse rounded bg-zinc-200" /> : (email || '—')}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-[11px] uppercase tracking-wide text-zinc-500">Saldo disponível</div>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                      {loading ? '—' : `${balance} Koins`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Blocos 2 e 3 — Formulário e Histórico (cards lado a lado) */}
        {userId && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Card: Formulário */}
            <section className={`${CARD} ${CARD_PAD}`}>
              <div className="mb-4">
                <h2 className={TITLE}>Solicitar resgate</h2>
                <p className={SUB}>O valor vira um cupom após aprovação.</p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Quantidade a resgatar (Koins)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={balance || undefined}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Ex.: 150"
                      className={INPUT}
                    />
                    <button
                      type="button"
                      onClick={useMax}
                      className={`${BTN_SOFT} absolute inset-y-0 right-1 my-1`}
                    >
                      Usar máx.
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Máx.: {balance} Koins</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">
                    Observação (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex.: Preciso do cupom hoje"
                    className={`${INPUT} resize-none`}
                  />
                </div>

                <button type="submit" disabled={loading || submitting} className={BTN_PRIMARY}>
                  {submitting ? 'Enviando…' : 'Solicitar Resgate'}
                </button>
              </form>
            </section>

            {/* Card: Histórico */}
            <section className={`${CARD} ${CARD_PAD}`}>
              <div className="mb-4">
                <h2 className={TITLE}>Histórico</h2>
              </div>

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
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  Nenhuma solicitação ainda. Pedidos aprovados exibem o <span className="font-medium">cupom</span>.
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200">
                  {history.map((w) => (
                    <li key={w.id} className="flex items-start justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-900">{w.amount_koins} Koins</div>
                        <div className="text-xs text-zinc-500">
                          {new Date(w.created_at).toLocaleString('pt-BR')}
                          {w.note ? ` • ${w.note}` : ''}
                        </div>
                        {w.coupon && w.status === 'approved' && (
                          <div className="mt-1 inline-flex items-center gap-2">
                            <span className="rounded-lg bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-inset ring-zinc-200">
                              {w.coupon}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyCoupon(w.coupon!)}
                              className={BTN_SOFT}
                            >
                              copiar
                            </button>
                          </div>
                        )}
                      </div>
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${chip[w.status]}`}>
                        {w.status === 'pending' && 'Pendente'}
                        {w.status === 'approved' && 'Aprovado'}
                        {w.status === 'denied' && 'Negado'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
