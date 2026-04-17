'use client'

import { useState, useEffect } from 'react'
import { getSessao, setSessao, limparSessao, SessaoUsuario } from '@/lib/auth'

export function useAuth() {
  const [sessao, setSessaoState] = useState<SessaoUsuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setSessaoState(getSessao())
    setCarregando(false)
  }, [])

  function login(s: SessaoUsuario) {
    setSessao(s)
    setSessaoState(s)
  }

  function logout() {
    limparSessao()
    setSessaoState(null)
  }

  return { sessao, carregando, login, logout, isGestor: sessao?.modo === 'gestor' }
}
