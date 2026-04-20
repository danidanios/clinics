'use client'

export type SessaoUsuario = {
  modo: 'gestor' | 'funcionaria'
  id?: string
  nome?: string
}

export function getSessao(): SessaoUsuario | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('sessao')
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessaoUsuario
  } catch {
    return null
  }
}

export function setSessao(sessao: SessaoUsuario) {
  sessionStorage.setItem('sessao', JSON.stringify(sessao))
}

export function limparSessao() {
  sessionStorage.removeItem('sessao')
}

export function isGestor(): boolean {
  return getSessao()?.modo === 'gestor'
}

// Rotas permitidas para funcionárias
export const ROTAS_FUNCIONARIA = ['/agenda', '/procedimentos', '/clientes']

export function temAcesso(rota: string, sessao: SessaoUsuario | null): boolean {
  if (!sessao) return false
  if (sessao.modo === 'gestor') return true
  return ROTAS_FUNCIONARIA.some(r => rota.startsWith(r))
}
