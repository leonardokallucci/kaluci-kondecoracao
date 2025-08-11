'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Role = 'admin' | 'escudo' | 'colaborador';

type Withdrawal = {
  id: string;
  user_id: string;
  amount_koins: number;
  status: 'pending' | 'approved' | 'denied';
  coupon: string | null;
  note: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  first_name: string;
  setor: string;
  role: Role;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// gera cupom simples: KLC-XXXX-XXXX
function genCoupon() {
  const rnd = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KLC-${rnd()}-${rnd()}`;
}

export default function AprovacoesPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        // Checa papel
        const { data: isAdminData, error: erole } = await supabase.rpc('is_admin');
        if (erole) throw erole;
        setIsAdmin(!!isAdminData);

        if (!isAdminData) {
          setRows([]);
          setProfiles({});
          return;
        }

        // Busca saques pendentes
        const { data: pend, error: ep } = await supabase
          .from('withdrawals')
          .select('id,user_id,amount_koins,status,coupon,note,created_at')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (ep) throw ep;

        const list = (pend || []) as Withdrawal[];
        setRows(list);

        if (list.length) {
          const ids = Array.from(new Set(list.map(r => r.user_id)));
          const { data: profs, error: epro } = await supabase
            .from('profiles')
            .select('user_id,first_name,setor,role')
            .in('user_id', ids);
          if (epro) throw epro;

          const map: Record<string, Profile> = {};
          (profs || []).forEach(p => { map[p.user_id] = p as Profile; });
          setProfiles(map);
        } else {
          setProfiles({});
        }

      } catch (e: any) {
        setErr(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  async function handleApprove(w: Withdrawal) {
    try {
      const defaultCode = genCoupon();
      const code = window.prompt(
        `Cupom para ${profiles[w.user_id]?.first_name || w.user_id}\n` +
        `Valor: ${w.amount_koins} Koins\n\n` +
        `Edite se quiser:\n`,
        defaultCode
      );
      if (!code) return;

      setBusyId(w.id);
      const { error } = await supabase.rpc('approve_withdrawal', {
        p_id: w.id,
        p_coupon: code
      });
      if (error) throw error;

      // retira da lista
      setRows(prev => prev.filter(r => r.id !== w.id));
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeny(w: Withdrawal) {
    if (!window.confirm(`Negar solicitação de ${profiles[w.user_id]?.first_name || w.user_id} de ${w.amount_koins} Koins?`)) {
      return;
    }
    try {
      setBusyId(w.id);
      const { error } = await supabase.rpc('deny_withdrawal', { p_id: w.id });
      if (error) throw error;
      setRows(prev => prev.filter(r => r.id !== w.id));
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="wrap">
      <h2>Aprovações de Resgate</h2>

      {err && <div className="alert error">{err}</div>}
      {loading && <div className="card">Carregando…</div>}

      {!loading && !isAdmin && (
        <div className="card">
          Você precisa ser <b>admin</b> para acessar esta página.
        </div>
      )}

      {!loading && isAdmin && rows.length === 0 && (
        <div className="card">Não há solicitações pendentes.</div>
      )}

      {!loading && isAdmin && rows.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Setor</th>
                <th style={{ textAlign: 'right', width: 120 }}>Koins</th>
                <th style={{ width: 180 }}>Criado em</th>
                <th style={{ width: 180 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(w => {
                const p = profiles[w.user_id];
                return (
                  <tr key={w.id}>
                    <td>
                      <div className="name">{p?.first_name || w.user_id}</div>
                      {w.note ? <div className="muted">Obs: {w.note}</div> : null}
                    </td>
                    <td>{p?.setor || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{w.amount_koins}</td>
                    <td>{new Date(w.created_at).toLocaleString('pt-BR')}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="btn approve"
                          onClick={() => handleApprove(w)}
                          disabled={busyId === w.id}
                        >
                          {busyId === w.id ? 'Aprovando…' : 'Aprovar'}
                        </button>
                        <button
                          className="btn deny"
                          onClick={() => handleDeny(w)}
                          disabled={busyId === w.id}
                        >
                          {busyId === w.id ? 'Negando…' : 'Negar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="hint">
            Ao aprovar, um <b>cupom</b> é gravado no saque (via RPC <code>approve_withdrawal</code>).
            Depois você cadastra o mesmo cupom na Shoppub.
          </p>
        </div>
      )}

      <style jsx>{`
        .wrap { max-width: 1000px; margin: 24px auto; padding: 0 16px; }
        h2 { margin: 0 0 12px; }
        .card { background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 12px rgba(0,0,0,.06); }
        .alert.error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
        table { width:100%; border-collapse:collapse; }
        th, td { padding:10px; border-bottom:1px solid #f1f5f9; }
        th { text-align:left; font-weight:600; color:#374151; }
        .name { font-weight:600; }
        .muted { color:#94a3b8; font-size:12px; margin-top:2px; }
        .row-actions { display:flex; gap:8px; }
        .btn {
          appearance:none; border:0; border-radius:8px; padding:8px 12px; cursor:pointer;
          font-weight:600;
        }
        .btn.approve { background:#ecfeff; color:#0e7490; }
        .btn.deny { background:#fef2f2; color:#991b1b; }
        .btn:disabled { opacity:.6; cursor:not-allowed; }
        .hint { margin:10px 0 0; color:#64748b; font-size:12px; }
      `}</style>
    </div>
  );
}
