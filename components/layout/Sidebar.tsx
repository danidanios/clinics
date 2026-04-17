'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, CreditCard, Users, UserCheck,
  BookOpen, BarChart2, Upload, LogOut,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SessaoUsuario } from '@/lib/auth'

type Item = { href: string; label: string; icon: React.ReactNode; soGestor?: boolean }

const itens: Item[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, soGestor: true },
  { href: '/agenda', label: 'Agenda', icon: <Calendar size={20} /> },
  { href: '/procedimentos', label: 'Procedimentos', icon: <BookOpen size={20} /> },
  { href: '/clientes', label: 'Clientes', icon: <Users size={20} /> },
  { href: '/financeiro', label: 'Financeiro', icon: <CreditCard size={20} />, soGestor: true },
  { href: '/funcionarias', label: 'Funcionárias', icon: <UserCheck size={20} />, soGestor: true },
  { href: '/catalogo', label: 'Catálogo', icon: <BookOpen size={20} />, soGestor: true },
  { href: '/relatorios', label: 'Relatórios', icon: <BarChart2 size={20} />, soGestor: true },
  { href: '/importar', label: 'Importar', icon: <Upload size={20} />, soGestor: true },
]

type Props = { sessao: SessaoUsuario; onLogout: () => void }

export function Sidebar({ sessao, onLogout }: Props) {
  const pathname = usePathname()
  const visivel = itens.filter(i => !i.soGestor || sessao.modo === 'gestor')

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-16 flex-col items-center border-r bg-white py-4 shadow-sm md:flex">
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600">
        <span className="text-lg font-bold text-white">D</span>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {visivel.map(item => {
          const ativo = pathname.startsWith(item.href)
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.href}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                      ativo
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-500 hover:bg-purple-50 hover:text-purple-600'
                    )}
                  />
                }
              >
                {item.icon}
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      <Tooltip>
        <TooltipTrigger
          onClick={onLogout}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={20} />
        </TooltipTrigger>
        <TooltipContent side="right">Sair</TooltipContent>
      </Tooltip>
    </aside>
  )
}
