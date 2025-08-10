import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        connected: false,
        error: 'Missing environment variables',
        supabaseUrl: supabaseUrl ?? '(empty)',
        anonKeyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
      },
      { status: 500 },
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // ajuste o nome da tabela se quiser; 'profiles' existe no seu schema
  const { data, error, status } = await supabase
    .from('profiles')
    .select('user_id, first_name')
    .limit(1)

  return NextResponse.json({
    connected: !error,
    status,
    supabaseUrl,
    anonKeyLength: supabaseAnonKey.length,
    error: error ? { message: error.message } : null,
    rows: data ?? null,
  })
}
