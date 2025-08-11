'use client';

import { useEffect, useMemo, useState } from 'react';
import * as SupabaseModule from '@/lib/supabaseClient'; // qualquer tipo de export

type WithdrawalStatus = 'pending' | 'approved' | 'denied';
type Withdrawal = {
  id: string;
  amount_koins: number;
  status: WithdrawalStatus;
  coupon: string | null;
  note: string | null;
  created_at: string;
};

const statusChip: Record<WithdrawalStatus, string> = {
  pending:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  denied:   'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

// -------- Adapter robusto para qualquer export do supabaseClient --------
function resolveSupabaseClient(): any {
  const m: any = SupabaseModule as any;

  // 1) export const supabase = createClient(...)
  if (m.supabase?.auth) return m.supabase;

  // 2) export default {supabase}
  if (m.default?.supabase?.auth) return m.default.supabase;

  // 3) export function createClient() { return createClient(...) }
  if (typeof m.createClient === 'function') {
    const c = m.createClient();
    if (c?.auth) return c;
  }

  // 4) export default function createClient() { ... }
  if (typeof m.default === 'function') {
    const c = m.default();
    if (c?.auth) return c;
  }

  // 5) export default supabase (instância)
  if (m.default?.auth) return m.default;

  // 6) último recurso: o próprio módulo pode ser a instância
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

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      // se o client estivesse indefinido, o adapter já teria lançado erro
      const { data, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const user = data?.session?.user;
      if (!user) {
        setEmail('');
        setUserId('');
        setBalance(0);
        setHistory([]);
        return;
      }

      setEmail(user.email ?? '');
      setUserId(user.id);

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

    if (error) {
      setBalance(0);
      return;
    }
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    const a = Number(amount);
    if (!a || a <= 0) return setError('Informe um valor válido de Koins.');
    if (a > balance)   return setError('Valor solicitado é maior que seu saldo disponível.');

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: a,
        p_note: note || null,
      });
      if (error) throw error;

      setOkMsg('Solicitação enviada! Aguarde aprovação.');
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
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Resgatar Koins</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Converta seus Koins em cupom. O pedido vai para aprovação.
        </p>
      </div>

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

      {!loading && !userId && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-700 shadow-sm">
          Você não está logado. Acesse{' '}
          <a href="/login" className="font-medium text-indigo-600 hover:underline">
            /login
          </a>{' '}
          para continuar.
        </div>
      )}

      {userId && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Formulário */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Usuário</div>
                <div className="mt-1 font-medium text-zinc-900">
                  {loading ? <span className="inline-block h-4 w-40 animate-pulse rounded bg-zinc-200" /> : (email || '—')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Saldo disponível</div>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                    {loading ? '—' : `${balance} Koins`}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  Quantidade a resgatar (Koins)
                </label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ex.: 150"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-indigo-400"
                />
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
                  className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-indigo-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading || submitting}
                className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Enviando…' : 'Solicitar Resgate'}
              </button>
            </form>
          </div>

          {/* Histórico */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Histórico</h2>
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
              <p className="text-sm text-zinc-500">
                Nenhuma solicitação ainda.
                <br />
                Pedidos aprovados exibem o <span className="font-medium">cupom</span>. Use-o no site conforme combinado.
              </p>
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
                        <div className="mt-1">
                          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-inset ring-zinc-200">
                            {w.coupon}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusChip[w.status]}`}>
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
      )}
    </div>
  );
}
