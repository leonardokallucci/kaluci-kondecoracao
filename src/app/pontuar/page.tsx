'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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

export default function PontuarPage() {
  const [me, setMe] = useState<{ email: string | null; isEscudo: boolean; isAdmin: boolean } | null>(null);
  const [colabs, setColabs] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user_id: '',
    criterio: '',
    pontos: 1,
    motivo: '',
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Carrega sessão + meu perfil e lista de colaboradores
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email ?? null;

        // checa se sou admin/escudo via helpers
        const { data: isAdminData, error: e1 } = await supabase.rpc('is_admin');
        if (e1) throw e1;
        const { data: isEscudoData, error: e2 } = await supabase.rpc('is_escudo');
        if (e2) throw e2;

        setMe({ email, isEscudo: !!isEscudoData, isAdmin: !!isAdminData });

        // somente escudo/admin podem listar todo mundo
        if (isAdminData || isEscudoData) {
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id, first_name, setor, role')
            .order('first_name');

          if (error) throw error;
          setColabs(data || []);
        } else {
          setColabs([]);
        }

      } catch (e: any) {
        setErr(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!me?.isAdmin && !me?.isEscudo) {
      setErr('Apenas escudo/admin podem pontuar.');
      return;
    }
    if (!form.user_id) {
      setErr('Selecione um colaborador.');
      return;
    }
    if (!form.criterio.trim()) {
      setErr('Descreva o critério.');
      return;
    }
    if (form.pontos < 1 || form.pontos > 10) {
      setErr('Pontos devem estar entre 1 e 10.');
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase.rpc('award_points', {
        p_user_id: form.user_id,
        p_criterio: form.criterio,
        p_pontos: form.pontos,
        p_motivo: form.motivo || null,
      });
      if (error) throw error;

      setMsg(`Pontuação aplicada! (+${data?.pontos ?? form.pontos} pontos)`);
      // limpa só campos textuais
      setForm((f) => ({ ...f, criterio: '', motivo: '' }));
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <h2>Pontuar</h2>
        <p>Carregando…</p>
      </div>
    );
  }

  if (!me?.email) {
    return (
      <div className="container">
        <h2>Pontuar</h2>
        <p>Você precisa <a href="/login">entrar</a> para pontuar.</p>
      </div>
    );
  }

  if (!me.isAdmin && !me.isEscudo) {
    return (
      <div className="container">
        <h2>Pontuar</h2>
        <p>Apenas Escudo/Admin podem pontuar.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Pontuar</h2>

      {msg && <div className="alert success">{msg}</div>}
      {err && <div className="alert error">{err}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="row">
          <label>Colaborador</label>
          <select
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          >
            <option value="">— selecione —</option>
            {colabs.map((c) => (
              <option key={c.user_id} value={c.user_id}>
                {c.first_name} ({c.setor})
              </option>
            ))}
          </select>
        </div>

        <div className="row">
          <label>Critério</label>
          <input
            type="text"
            placeholder="Ex: Atendimento acima do esperado"
            value={form.criterio}
            onChange={(e) => setForm({ ...form, criterio: e.target.value })}
          />
        </div>

        <div className="row">
          <label>Pontos (1–10)</label>
          <input
            type="number"
            min={1}
            max={10}
            value={form.pontos}
            onChange={(e) => setForm({ ...form, pontos: Number(e.target.value) })}
          />
        </div>

        <div className="row">
          <label>Motivo (opcional)</label>
          <textarea
            rows={3}
            placeholder="Contexto / observações"
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Aplicar Pontos'}
        </button>
      </form>

      <style jsx>{`
        .container { max-width: 920px; margin: 24px auto; padding: 0 16px; }
        h2 { margin-bottom: 16px; }
        .card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 12px rgba(0,0,0,0.06); }
        .row { display: flex; flex-direction: column; margin-bottom: 12px; }
        label { font-weight: 600; margin-bottom: 6px; }
        input, select, textarea { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
        .alert { padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }
        .alert.success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .alert.error   { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        button { background: #111; color: #fff; padding: 10px 14px; border: 0; border-radius: 8px; cursor: pointer; }
        button:disabled { opacity: .7; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
