import type { Metadata } from 'next'
import '@/styles/globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Kaluci — Kondecoração',
  description: 'Sistema interno de reconhecimento e Koins'
}

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="pt-br">
      <body>
        <header className="header">
          <div className="container header-inner">
            <div className="brand">
              <img src="/logo.png" className="brand-logo" alt="Kaluci" />
              <div>
                <div className="brand-title">Kondecoração — Escudo Kaluci</div>
                <div className="brand-sub">1 ponto = 5 Koins • 1 Koin = R$1 (Pix)</div>
              </div>
            </div>
            <Nav />
          </div>
        </header>
        <main>
          <div className="container">{children}</div>
        </main>
      </body>
    </html>
  )
}
