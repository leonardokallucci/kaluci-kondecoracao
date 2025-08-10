# Kaluci — Kondecoração (clean)

## Variáveis de ambiente (Vercel → Settings → Environment Variables)
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL do Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key do Supabase
- `NEXT_PUBLIC_APP_URL` = URL pública do app (ex.: https://kaluci-kondecoracao.vercel.app)

> Não precisa configurar Root Directory na Vercel. O projeto está na **raiz** (tem `package.json` na raiz).

## Rotas
- `/login` — autenticação
- `/logout`
- `/dashboard` — visão do colaborador
- `/pontuar` — Escudos/Admin lançam pontos
- `/resgatar` — colaborador solicita Koins
- `/aprovacoes` — Admin aprova e gera cupom
- `/ranking`
- `/colaboradores` — Admin lista/cadastra perfis
