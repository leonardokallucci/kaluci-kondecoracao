export default function EnvCheck() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '(vazio)'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const masked = key ? `${key.slice(0,6)}...${key.slice(-4)} (len=${key.length})` : '(vazio)'
  return (
    <div style={{fontFamily:'Inter, Arial', padding: 20}}>
      <h2>Env Check</h2>
      <div><b>URL:</b> {url}</div>
      <div><b>ANON:</b> {masked}</div>
      <p style={{marginTop:12, color:'#555'}}>
        Se o comprimento (len) estiver 0/pequeno, a env na Vercel não foi lida. Faça Redeploy após editar variáveis.
      </p>
    </div>
  )
}
