'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, BookOpen, Users, CreditCard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SessaoUsuario } from '@/lib/auth'

type Item = { href: string; label: string; icon: React.ReactNode; soGestor?: boolean }

const itens: Item[] = [
  { href: '/dashboard', label: 'Início', icon: <LayoutDashboard size={20} />, soGestor: true },
  { href: '/agenda', label: 'Agenda', icon: <Calendar size={20} /> },
  { href: '/procedimentos', label: 'Proced.', icon: <BookOpen size={20} /> },
  { href: '/clientes', label: 'Clientes', icon: <Users size={20} /> },
  { href: '/financeiro', label: 'Caixa', icon: <CreditCard size={20} />, soGestor: true },
]

type Props = { sessao: SessaoUsuario; onLogout: () => void }

export function BottomNav({ sessao, onLogout }: Props) {
  const pathname = usePathname()
  const visivel = itens.filter(i => !i.soGestor || sessao.modo === 'gestor')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t bg-white md:hidden">
      {visivel.map(item => {
        const ativo = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
              ativo ? 'text-purple-600' : 'text-gray-500'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        )
      })}
      <button
        onClick={onLogout}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-gray-500 transition-colors hover:text-red-500"
      >
        <LogOut size={20} />
        <span>Sair</span>
      </button>
    </nav>
  )
}
