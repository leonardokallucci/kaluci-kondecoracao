# Kaluci — Kondecoração (App)

## Passos rápidos
1) Instale dependências:
```
npm install
```
2) Copie `.env.example` para `.env.local` e cole **URL** e **ANON KEY** do seu Supabase.
3) Rode local:
```
npm run dev
```
4) Acesse:
- `http://localhost:3000` (home)
- `http://localhost:3000/login` (entrar)
- `http://localhost:3000/dashboard` (dashboard)
- `http://localhost:3000/pontuar` (escudo/admin)
- `http://localhost:3000/resgatar`
- `http://localhost:3000/aprovacoes` (admin)
- `http://localhost:3000/ranking`
- `http://localhost:3000/colaboradores` (admin)

## Deploy (leonardokallucci)
- Suba para o GitHub no repositório: `https://github.com/leonardokallucci/kaluci-kondecoracao`.
- Na Vercel (conta `leonardokallucci-4812`), clique **New Project** e importe esse repositório.
- Em **Environment Variables** cole as mesmas variáveis do `.env.local`.
- Deploy!

## Observação
Antes de usar, crie os usuários em **Supabase > Authentication** e rode os `upsert_profile(...)` com os UUIDs (arquivo `upsert_profiles_template.sql` do bundle do Supabase).
