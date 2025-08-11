'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Role = 'admin' | 'escudo' | 'colaborador';

type Profile = {
  user_id: string;
  first_name: string;
  setor: string;
  role: Role;
  created_at: string;
};

type Totals = {
  user_id: string;
  pontos_total: number;
  koins_total: number;
};

type Balance = {
  user_id: string;
  koins_balance: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ColaboradoresPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [me, setMe] = useState<{ email: string | null; isAdmin: boolean; isEscudo: boolean } | null>(null);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [totalsMap, setTotalsMap] = useState<Record<string, Totals>>({});
  const [balanceMap, setBalanceMap] = useState<Record<string, Balance>>({});

  const [q, setQ] = useState('');

  const canSeeAll = !!(me?.isAdmin || me?.isEscudo);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((p) => {
      const hay = `${p.first_name} ${p.setor} ${p.role}`.toLowerCase();
      return hay.includes(term);
    });
  }, [profiles, q]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        // Sessão + papéis (via RPCs com security definer)
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email ?? null;

        const { data: isAdminData, error: e1 } = await supabase.rpc('is_admin');
        if (e1) throw e1;
        const { data: isEscudoData, error: e2 } = await supabase.rpc('is_escudo');
        if (e2) throw e2;

        setMe({ email, isAdmin: !!isAdminData, isEscudo: !!isEscudoData });

        // Perfis (RLS: colaborador verá só o próprio)
        const { data: profs, error: ep } = await supabase
          .from('profiles')
          .select('user_id,first_name,setor,role,created_at')
          .order('first_name', { ascending: true });
        if (ep) throw ep;

        setProfiles((profs || []) as Profile[]);

        const ids = (profs || []).map((p) => p.user_id);
        if (ids.length) {
          // Totais (pontos_total, koins_total)
          const { data: tot, error: et } = await supabase
            .from('v_user_totals')
            .select('user_id,pontos_total,koins_total')
            .in('user_id', ids);
          if (et) throw et;
          const tmap: Record<string, Totals> = {};
          (tot || []).forEach((t) => (tmap[t.user_id] = t as Totals));
          setTotalsMap(tmap);

          // Saldos (koins_balance)
          const { data: bal, error: eb } = await supabase
            .from('v_user_balance')
            .select('user_id,koins_balance')
            .in('user_id', ids);
          if (eb) throw eb;
          const bmap: Record<string, Balance> = {};
          (bal || []).forEach((b) => (bmap[b.user_id] = b as Balance));
          setBalanceMap(bmap);
        } else {
          setTotalsMap({});
          setBalanceMap({});
        }
      } catch (e: any) {
        setErr(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="wrap">
      <div className="head">
        <h2>Colaboradores</h2>
        <div className="actions">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, setor, função…"
          />
        </div>
      </div>

      {err && <div className="alert error">{err}</div>}
      {loading && <div className="card">Carregando…</div>}

      {!loading && filtered.length === 0 && (
        <div className="card">Nenhum colaborador encontrado.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Setor</th>
                <th style={{ width: 120 }}>Função</th>
                <th style={{ textAlign: 'right', width: 110 }}>Pontos</th>
                <th style={{ textAlign: 'right', width: 110 }}>Koins</th>
                <th style={{ textAlign: 'right', width: 120 }}>Saldo Koins</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const tot = totalsMap[p.user_id];
                const bal = balanceMap[p.user_id];
                return (
                  <tr key={p.user_id}>
                    <td>
                      <div className="name">{p.first_name}</div>
                      <div className="muted">{p.user_id}</div>
                    </td>
                    <td>{p.setor}</td>
                    <td>
                      <span className={`badge ${p.role}`}>{p.role}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {tot?.pontos_total ?? 0}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {tot?.koins_total ?? 0}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {bal?.koins_balance ?? (tot?.koins_total ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="hint">
            {canSeeAll
              ? 'Exibindo todos os colaboradores (admin/escudo).'
              : 'Por política de acesso, colaboradores visualizam apenas o próprio perfil.'}
          </p>
        </div>
      )}

      <style jsx>{`
        .wrap { max-width: 1000px; margin: 24px auto; padding: 0 16px; }
        .head { display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; }
        h2 { margin: 0; }
        .actions input {
          width: 320px;
          padding: 8px 10px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          outline: none;
        }
        .card { background:#fff; border-radius:12px; padding:12px; box-shadow:0 1px 12px rgba(0,0,0,.06); }
        .alert.error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
        table { width:100%; border-collapse:collapse; }
        th, td { padding:10px; border-bottom:1px solid #f1f5f9; }
        th { text-align:left; font-weight:600; color:#374151; }
        .name { font-weight:600; }
        .muted { color:#94a3b8; font-size:12px; }
        .hint { margin:10px 0 0; color:#64748b; font-size:12px; }

        .badge {
          text-transform: capitalize;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge.admin { background:#eef2ff; color:#4338ca; }
        .badge.escudo { background:#ecfeff; color:#0e7490; }
        .badge.colaborador { background:#f1f5f9; color:#334155; }
      `}</style>
    </div>
  );
}
