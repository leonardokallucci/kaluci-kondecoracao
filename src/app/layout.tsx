import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Kaluci — Kondecoração',
  description: 'Sistema interno de reconhecimento e Koins'
}

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="pt-br">
      <body>
        <header className="border-b">
          <div className="container py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-black text-white grid place-items-center font-bold">K</div>
              <div>
                <div className="text-sm font-semibold">Kondecoração — Escudo Kaluci</div>
                <div className="text-xs text-neutral-500">1 ponto = 5 Koins • 1 Koin = R$1 (Pix)</div>
              </div>
            </div>
            <nav className="flex items-center gap-2 text-sm">
              <a className="btn" href="/login">Entrar</a>
              <a className="btn" href="/dashboard">Dashboard</a>
            </nav>
          </div>
        </header>
        <main className="container py-6">{children}</main>
      </body>
    </html>
  )
}
