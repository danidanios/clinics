// Altura em pixels por hora na grade de horários (cada slot de 30min = 48px)
export const ALTURA_HORA = 96

// Altura em pixels por slot de 30 minutos
export const ALTURA_SLOT = ALTURA_HORA / 2

// Altura total da grade (24 horas)
export const ALTURA_GRADE = 24 * ALTURA_HORA

// Cores atribuídas às funcionárias por índice de criação
export const CORES_FUNCIONARIA = [
  '#7C3AED',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DB2777',
  '#0891B2',
  '#DC2626',
  '#7C3AED',
]

export function corFuncionaria(indice: number): string {
  return CORES_FUNCIONARIA[indice % CORES_FUNCIONARIA.length]
}

// Converte "HH:MM" para posição em pixels na grade
export function horaToPx(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return (h * 60 + m) * ALTURA_HORA / 60
}

// Converte índice de slot (0..47) para string "HH:MM"
export function slotParaHora(slot: number): string {
  const h = Math.floor(slot / 2)
  const m = slot % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
}

// Gera os slots de hora disponíveis no modal (08:00 a 22:00, de 30 em 30 min)
export const SLOTS_MODAL: string[] = Array.from({ length: 29 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
})

// Adiciona minutos a uma string "HH:MM"
export function adicionarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + minutos
  const novaH = Math.floor(total / 60) % 24
  const novaM = total % 60
  return `${String(novaH).padStart(2, '0')}:${String(novaM).padStart(2, '0')}`
}

// Nomes dos dias da semana abreviados em português
export const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Nomes dos meses em português
export const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
