import { supabase } from '@/src/lib/supabaseClient'

export async function getMyBalance() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase
    .from('v_user_balance')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function getMyRank() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase
    .from('v_user_rank')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (error) throw error
  return data
}

export async function getMyWithdrawals() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getRankingMensal() {
  const { data, error } = await supabase
    .from('v_ranking_mensal')
    .select('user_id, pontos_mes, koins_mes')
    .order('pontos_mes', { ascending: false })
  if (error) throw error
  const ids = (data || []).map(d => d.user_id)
  if (!ids.length) return []
  const { data: perfis } = await supabase
    .from('profiles')
    .select('user_id, first_name, setor')
    .in('user_id', ids)
  const map = new Map((perfis || []).map(p => [p.user_id, p]))
  return (data || []).map(row => ({ ...row, profile: map.get(row.user_id) }))
}

export async function awardPoints(userId: string, criterio: string, pontos: number, motivo?: string) {
  const { data, error } = await supabase.rpc('award_points', {
    p_user_id: userId,
    p_criterio: criterio,
    p_pontos: pontos,
    p_motivo: motivo ?? null
  })
  if (error) throw error
  return data
}

export async function requestWithdrawal(amount: number, note?: string) {
  const { data, error } = await supabase.rpc('request_withdrawal', {
    p_amount: amount,
    p_note: note ?? null
  })
  if (error) throw error
  return data
}

export async function approveWithdrawal(withdrawalId: string, coupon: string) {
  const { data, error } = await supabase.rpc('approve_withdrawal', {
    p_id: withdrawalId,
    p_coupon: coupon
  })
  if (error) throw error
  return data
}

export async function denyWithdrawal(withdrawalId: string) {
  const { data, error } = await supabase.rpc('deny_withdrawal', { p_id: withdrawalId })
  if (error) throw error
  return data
}
