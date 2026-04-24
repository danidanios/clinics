// Hora de início e fim da grade visível
export const HORA_INICIO = 8
export const HORA_FIM = 23

// Altura em pixels por hora na grade de horários (cada slot de 30min = 56px)
export const ALTURA_HORA = 112

// Altura em pixels por slot de 30 minutos
export const ALTURA_SLOT = ALTURA_HORA / 2

// Número de slots de 30min na grade
export const NUM_SLOTS = (HORA_FIM - HORA_INICIO) * 2

// Altura total da grade (8h às 23h = 15 horas)
export const ALTURA_GRADE = (HORA_FIM - HORA_INICIO) * ALTURA_HORA

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

// Converte "HH:MM" para posição em pixels na grade (relativo a HORA_INICIO)
export function horaToPx(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return Math.max(0, ((h - HORA_INICIO) * 60 + m) * ALTURA_HORA / 60)
}

// Converte índice de slot (0..NUM_SLOTS-1) para string "HH:MM" (começa em HORA_INICIO)
export function slotParaHora(slot: number): string {
  const h = Math.floor(slot / 2) + HORA_INICIO
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

// Retorna o próximo slot disponível de 30 min como default para Hora início
// quando não há slot clicado. Se a data for hoje, arredonda o horário atual para
// o próximo slot; caso contrário começa em 08:00. Sempre dentro de 08:00–22:00.
export function proximoSlot(dataAlvo: string, dataHoje: string): string {
  if (dataAlvo === dataHoje) {
    const agora = new Date()
    let h = agora.getHours()
    let m = agora.getMinutes()
    if (m === 0) {
      // mantém
    } else if (m <= 30) {
      m = 30
    } else {
      h += 1
      m = 0
    }
    if (h < 8) { h = 8; m = 0 }
    if (h > 22 || (h === 22 && m > 0)) { h = 22; m = 0 }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return '08:00'
}

// Nomes dos dias da semana abreviados em português
export const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Nomes dos dias da semana por extenso em português
export const DIAS_SEMANA_EXT = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

// Nomes dos meses em português
export const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
