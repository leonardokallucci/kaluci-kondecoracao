'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pontuar', label: 'Pontuar' },
  { href: '/resgatar', label: 'Resgatar' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/aprovacoes', label: 'Aprovações' },
  { href: '/colaboradores', label: 'Colaboradores' },
  { href: '/login', label: 'Entrar' }
]

export default function Nav(){
  const pathname = usePathname()
  return (
    <nav className="nav">
      {LINKS.map(l => (
        <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''}>{l.label}</Link>
      ))}
    </nav>
  )
}
