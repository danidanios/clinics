import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata valor para R$ 1.250,00
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

// Formata data ISO para dd/mm/aaaa
export function formatarData(data?: string | null): string {
  if (!data) return '-'
  const d = new Date(data + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

// Formata timestamptz para dd/mm/aaaa HH:MM
export function formatarDataHora(ts?: string | null): string {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Gera ID único
export function gerarId(): string {
  return crypto.randomUUID()
}

// Converte string de valor para número
export function normalizarValor(v: string): number {
  const s = v
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  return parseFloat(s) || 0
}

// Formata número sequencial com 4 dígitos: "0001"
export function formatarNumero(n: number): string {
  return String(n).padStart(4, '0')
}

// Data de hoje em ISO (yyyy-mm-dd)
export function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

// Paleta de cores das funcionárias — mesma usada na agenda e em todo o sistema
export const CORES_FUNCIONARIA = [
  '#7C3AED', // roxo
  '#2563EB', // azul
  '#059669', // verde
  '#D97706', // âmbar
  '#DB2777', // rosa
  '#0891B2', // teal
  '#DC2626', // vermelho
]

// Cor da funcionária pelo índice na lista ordenada (mesma lógica em toda a UI)
export function getCorFuncionaria(indice: number): string {
  return CORES_FUNCIONARIA[indice % CORES_FUNCIONARIA.length]
}

// Cor determinística a partir do nome (para avatar de cliente ou nome sem índice)
export function corPorNome(nome: string): string {
  const cores = [
    '#7C3AED', '#2563EB', '#059669', '#DC2626',
    '#D97706', '#DB2777', '#0891B2', '#65A30D',
  ]
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return cores[Math.abs(hash) % cores.length]
}

// Inicial do nome
export function inicialNome(nome: string): string {
  return nome.charAt(0).toUpperCase()
}

// Converte data dd/mm/aaaa → yyyy-mm-dd
export function dataParaISO(data: string): string {
  const [d, m, a] = data.split('/')
  return `${a}-${m}-${d}`
}
