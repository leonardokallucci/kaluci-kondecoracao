import Link from 'next/link'

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bem-vindo ao Kondecoração da Kaluci</h1>
      <p className="text-neutral-600">Use o menu acima para navegar. Após entrar, veja o Dashboard, Pontuar, Resgatar, Aprovações, Ranking e Colaboradores.</p>
      <div className="flex gap-2">
        <Link className="btn" href="/dashboard">Ir para Dashboard</Link>
        <Link className="btn" href="/login">Fazer login</Link>
      </div>
    </div>
  )
}
