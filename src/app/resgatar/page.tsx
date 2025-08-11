'use client';

import { useEffect, useMemo, useState } from 'react';
import * as SupabaseModule from '@/lib/supabaseClient';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400','600','700'] });

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
  pending:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  denied:   'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

// ——— estilos no MESMO “mood” do print ———
const SHELL = 'bg-zinc-50 min-h-screen';
const WRAP  = 'mx-auto max-w-7xl px-6 py-6';
const CARD  = 'rounded-2xl border border-zinc-200 bg-white shadow-sm';
const PAD   = 'p-6';
const TITLE = 'text-[15px] font-semibold text-zinc-900';
const HELP  = 'text-sm text-zinc-500';
const INPUT = 'w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200';
const BTN   = 'rounded-xl bg-zinc-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SOFT = 'rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100';

// ——— adapter p/ qualquer export de supabaseClient ———
function resolveSupabaseClient(): any {
  const m: any = SupabaseModule as any;
  if (m.supabase?.auth) return m.supabase;
  if (m.default?.supabase?.auth) return m.default.supabase;
  if (typeof m.createClient === 'function') { const c = m.createClient(); if (c?.auth) return c; }
  if (typeof m.default === 'function') { const c = m.default(); if (c?.auth) return c; }
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
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  async function loadAll() {
    setLoading(true); setError(null);
    try {
      const { data, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;
      const user = data?.session?.user;
      if (!user) { setEmail(''); setUserId(''); setBalance(0); setHistory([]); return; }
      setEmail(user.email ?? ''); setUserId(user.id);
      await Promise.all([loadBalance(user.id), loadHistory(user.id)]);
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao carregar dados.');
    } finally { setLoading(false); }
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

  function useMax() { setAmount(String(balance || '')); }

  async function copyCoupon(c: string) {
    try { await navigator.clipboard.writeText(c); setOkMsg('Cupom copiado!'); setTimeout(() => setOkMsg(null), 1200); } catch {}
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOkMsg(null);
    const a = Number(amount);
    if (!a || a <= 0) return setError('Informe um valor válido de Koins.');
    if (a > balance)   return setError('Valor solicitado é maior que seu saldo disponível.');
    try {
      setSubmitting(true);
      const { error } = await supabase.rpc('request_withdrawal', { p_amount: a, p_note: note || null });
      if (error) throw error;
      setOkMsg('Solicitação enviada! Aguarde aprovação.');
      setAmount(''); setNote('');
      await Promise.all([loadBalance(userId), loadHistory(userId)]);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível enviar a solicitação.');
    } finally { setSubmitting(false); }
  }

  return (
    <div className={`${jakarta.className} ${SHELL}`}>
      <div className={WRAP}>
        {/* título simples, sem infos extras */}
        <h1 className="mb-4 text-2xl font-semibold tracking-tight text-zinc-900">Resgatar</h1>

        {/* alerts no mesmo estilo dos cards */}
        {error && (
          <div className={`${CARD} ${PAD} mb-6 border-rose-200 bg-rose-50/70`}>
            <p className="text-sm font-medium text-rose-700">{error}</p>
          </div>
        )}
        {okMsg && (
          <div className={`${CARD} ${PAD} mb-6 border-emerald-200 bg-emerald-50/70`}>
            <p className="text-sm font-medium text-emerald-700">{okMsg}</p>
          </div>
        )}

        {/* dois blocos arredondados lado a lado – só estilo */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bloco 1: Formulário */}
          <section className={`${CARD} ${PAD}`}>
            <h2 className={TITLE}>Solicitar resgate</h2>
            <p className="mt-1 ${HELP}">Seu pedido será analisado.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Usuário</div>
                <div className="mt-1 text-sm font-medium text-zinc-900">
                  {loading ? <span className="inline-block h-4 w-40 animate-pulse rounded bg-zinc-200" /> : (email || '—')}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Saldo</div>
                <div className="mt-1 inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-sm font-semibold text-zinc-800 ring-1 ring-inset ring-zinc-200">
                  {loading ? '—' : `${balance} Koins`}
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Quantidade</label>
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
                  <button type="button" onClick={useMax} className={`${BTN_SOFT} absolute inset-y-0 right-1 my-1`}>
                    Usar máx.
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Máx.: {balance} Koins</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Observação</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="(opcional)"
                  className={`${INPUT} resize-none`}
                />
              </div>

              <button type="submit" disabled={loading || submitting} className={BTN}>
                {submitting ? 'Enviando…' : 'Solicitar Resgate'}
              </button>
            </form>
          </section>

          {/* Bloco 2: Histórico */}
          <section className={`${CARD} ${PAD}`}>
            <h2 className={TITLE}>Histórico</h2>

            <div className="mt-4">
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
                  Nenhuma solicitação ainda.
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200">
                  {history.map((w) => (
                    <li key={w.id} className="flex items-start justify-between py-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{w.amount_koins} Koins</div>
                        <div className="text-xs text-zinc-500">
                          {new Date(w.created_at).toLocaleString('pt-BR')}
                          {w.note ? ` • ${w.note}` : ''}
                        </div>
                        {w.coupon && w.status === 'approved' && (
                          <div className="mt-1 inline-flex items-center gap-2">
                            <span className="rounded-lg bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-inset ring-zinc-200">
                              {w.coupon}
                            </span>
                            <button type="button" onClick={() => copyCoupon(w.coupon!)} className={BTN_SOFT}>
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
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
