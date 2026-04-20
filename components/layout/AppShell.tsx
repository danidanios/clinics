'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSessao, temAcesso, SessaoUsuario } from '@/lib/auth'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { limparSessao } from '@/lib/auth'

const ROTAS_PUBLICAS = ['/login']

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<SessaoUsuario | null>(null)
  const [pronto, setPronto] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const s = getSessao()
    setSessao(s)
    setPronto(true)

    if (!s && !ROTAS_PUBLICAS.includes(pathname)) {
      router.replace('/login')
      return
    }
    if (s && !temAcesso(pathname, s) && !ROTAS_PUBLICAS.includes(pathname)) {
      router.replace('/agenda')
    }
    if (s && pathname === '/login') {
      router.replace(s.modo === 'gestor' ? '/dashboard' : '/agenda')
    }
  }, [pathname, router])

  function logout() {
    limparSessao()
    setSessao(null)
    router.replace('/login')
  }

  if (!pronto) return null

  const publica = ROTAS_PUBLICAS.includes(pathname)

  if (publica) return <>{children}</>

  if (!sessao) return null

  return (
    <div className="flex h-full">
      <Sidebar sessao={sessao} onLogout={logout} />
      <main className="flex-1 overflow-y-auto pb-20 md:ml-16 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
      </main>
      <BottomNav sessao={sessao} onLogout={logout} />
    </div>
  )
}
