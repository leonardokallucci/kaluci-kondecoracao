import { supabase } from '@/lib/supabaseClient'

export async function getMyBalance() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase.from('v_user_balance').select('*').eq('user_id', user.id).single()
  if (error) throw error
  return data
}

export async function getMyRank() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase.from('v_user_rank').select('*').eq('user_id', user.id).single()
  if (error) throw error
  return data
}

export async function getMyWithdrawals() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Não autenticado')
  const { data, error } = await supabase.from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function awardPoints(userId: string, criterio: string, pontos: number, motivo?: string) {
  const { error } = await supabase.rpc('award_points', { p_user_id: userId, p_criterio: criterio, p_pontos: pontos, p_motivo: motivo ?? null })
  if (error) throw error
}

export async function requestWithdrawal(amount: number, note?: string) {
  const { error } = await supabase.rpc('request_withdrawal', { p_amount: amount, p_note: note ?? null })
  if (error) throw error
}
