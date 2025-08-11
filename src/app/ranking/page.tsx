'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type RankRow = {
  user_id: string;
  pontos_mes: number;
  koins_mes: number;
};

type Profile = {
  user_id: string;
  first_name: string;
  setor: string;
  role: 'admin' | 'escudo' | 'colaborador';
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function mesLabel(d = new Date()) {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function RankingPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<{ email: string | null; isAdmin: boolean; isEscudo: boolean } | null>(null);
  const [rows, setRows] = useState<RankRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const tituloMes = useMemo(() => mesLabel(new Date()), []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        // sessão + papéis
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email ?? null;

        const { data: isAdminData, error: e1 } = await supabase.rpc('is_admin');
        if (e1) throw e1;
        const { data: isEscudoData, error: e2 } = await supabase.rpc('is_escudo');
        if (e2) throw e2;

        const isAdmin = !!isAdminData;
        const isEscudo = !!isEscudoData;
        setMe({ email, isAdmin, isEscudo });

        // ranking mensal (RLS: colaborador só enxerga a própria linha)
        const { data: rk, error: er } = await supabase
          .from('v_ranking_mensal')
          .select('user_id,pontos_mes,koins_mes')
          .order('pontos_mes', { ascending: false });
        if (er) throw er;

        setRows(rk || []);

        // Se admin/escudo, buscar perfis para exibir nome/setor
        if ((isAdmin || isEscudo) && rk && rk.length) {
          const ids = rk.map(r => r.user_id);
          const { data: profs, error: ep } = await supabase
            .from('profiles')
            .select('user_id,first_name,setor,role')
            .in('user_id', ids);
          if (ep) throw ep;

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

  return (
    <div className="container">
      <h2>Ranking — {tituloMes}</h2>

      {err && <div className="alert error">{err}</div>}
      {loading && <div className="card">Carregando…</div>}

      {!loading && !rows.length && (
        <div className="card">Ainda não há pontuações neste mês.</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th>Colaborador</th>
                <th>Setor</th>
                <th style={{ textAlign: 'right' }}>Pontos</th>
                <th style={{ textAlign: 'right' }}>Koins</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const p = profiles[r.user_id]; // só virá preenchido p/ admin/escudo
                const nome = p?.first_name ?? (me?.isAdmin || me?.isEscudo ? '—' : (i === 0 ? 'Você' : '—'));
                const setor = p?.setor ?? (me?.isAdmin || me?.isEscudo ? '—' : '');
                return (
                  <tr key={r.user_id}>
                    <td>{i + 1}</td>
                    <td>{nome}</td>
                    <td>{setor}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.pontos_mes}</td>
                    <td style={{ textAlign: 'right' }}>{r.koins_mes}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="hint">
            {me?.isAdmin || me?.isEscudo
              ? 'Exibindo ranking completo (admin/escudo).'
              : 'Por política de acesso, colaboradores visualizam apenas seus próprios números.'}
          </p>
        </div>
      )}

      <style jsx>{`
        .container { max-width: 960px; margin: 24px auto; padding: 0 16px; }
        h2 { margin-bottom: 16px; }
        .card { background: #fff; border-radius: 12px; padding: 12px; box-shadow: 0 1px 12px rgba(0,0,0,.06); }
        .alert.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
        th { text-align: left; font-weight: 600; color: #374151; }
        .hint { margin: 10px 0 0; color: #64748b; font-size: 12px; }
      `}</style>
    </div>
  );
}
