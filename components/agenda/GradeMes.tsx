'use client'

import { useState } from 'react'
import { Sessao, Funcionaria } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { hoje } from '@/lib/utils'
import { corFuncionaria } from './constants'

type Props = {
  dataBase: string
  sessoes: Sessao[]
  funcionarias: Funcionaria[]
  onDiaClick: (data: string) => void
  onSessaoClick: (sessao: Sessao) => void
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Grade da view Mês: calendário mensal com mini-cards por dia
export function GradeMes({ dataBase, sessoes, funcionarias, onDiaClick, onSessaoClick }: Props) {
  // Controle de dias expandidos (para "+ X mais")
  const [diasExpandidos, setDiasExpandidos] = useState<Set<string>>(new Set())

  const ano = parseInt(dataBase.substring(0, 4))
  const mes = parseInt(dataBase.substring(5, 7)) - 1

  const primeiroDia = new Date(ano, mes, 1).getDay()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()

  const dataHoje = hoje()

  // Gera datas do mês anterior para preencher o início da grade
  const diasAnteriores = primeiroDia
  const anoMesAnterior = mes === 0
    ? `${ano - 1}-12`
    : `${ano}-${String(mes).padStart(2, '0')}`
  const ultimoDiaAnterior = new Date(ano, mes, 0).getDate()

  // Mapa de cor por funcionária
  const corPorFunc: Record<string, string> = {}
  funcionarias.forEach((f, idx) => {
    corPorFunc[f.id] = corFuncionaria(idx)
  })

  function dataISO(d: number, offsetMes = 0): string {
    const m = mes + offsetMes
    const a = ano + Math.floor(m / 12)
    const mReal = ((m % 12) + 12) % 12
    return `${a}-${String(mReal + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function renderDia(isoData: string, outraMes: boolean) {
    const num = parseInt(isoData.split('-')[2])
    const sessDia = sessoes.filter((s) => s.data === isoData)
    const eHoje = isoData === dataHoje
    const expandido = diasExpandidos.has(isoData)
    const MAX_CARDS = 3

    return (
      <div
        key={isoData}
        className={cn(
          'border rounded-lg min-h-[80px] p-1 flex flex-col',
          outraMes ? 'bg-gray-50/50' : 'bg-white',
        )}
      >
        {/* Número do dia — clique navega para view Dia */}
        <button
          onClick={() => onDiaClick(isoData)}
          className={cn(
            'self-start text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5 transition-colors hover:bg-gray-100',
            eHoje && 'bg-[#7C3AED] text-white hover:bg-purple-700',
            outraMes && !eHoje && 'text-gray-300',
            !outraMes && !eHoje && 'text-gray-700',
          )}
        >
          {num}
        </button>

        {/* Mini-cards das sessões */}
        <div className="space-y-0.5 flex-1">
          {(expandido ? sessDia : sessDia.slice(0, MAX_CARDS)).map((s) => {
            const cor = corPorFunc[s.funcionaria_id || ''] || '#7C3AED'
            return (
              <button
                key={s.id}
                onClick={(e) => { e.stopPropagation(); onSessaoClick(s) }}
                className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-left hover:opacity-80 transition-opacity"
                style={{ backgroundColor: `${cor}18` }}
              >
                <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                <span className="text-[10px] text-gray-700 truncate">{s.cliente_nome}</span>
              </button>
            )
          })}

          {/* "+ X mais" expansível */}
          {!expandido && sessDia.length > MAX_CARDS && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDiasExpandidos((prev) => {
                  const next = new Set(prev)
                  next.add(isoData)
                  return next
                })
              }}
              className="text-[10px] text-gray-400 hover:text-gray-600 pl-1"
            >
              + {sessDia.length - MAX_CARDS} mais
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b flex-shrink-0">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-xs text-gray-500 font-medium py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-gray-200 p-px">
        {/* Dias do mês anterior */}
        {Array.from({ length: diasAnteriores }, (_, i) => {
          const dia = ultimoDiaAnterior - diasAnteriores + i + 1
          const iso = `${anoMesAnterior}-${String(dia).padStart(2, '0')}`
          return renderDia(iso, true)
        })}

        {/* Dias do mês atual */}
        {Array.from({ length: ultimoDia }, (_, i) => {
          const iso = `${dataBase.substring(0, 7)}-${String(i + 1).padStart(2, '0')}`
          return renderDia(iso, false)
        })}

        {/* Dias do próximo mês para completar a grade */}
        {(() => {
          const totalCelulas = diasAnteriores + ultimoDia
          const resto = totalCelulas % 7 === 0 ? 0 : 7 - (totalCelulas % 7)
          const proxMes = mes === 11
            ? `${ano + 1}-01`
            : `${ano}-${String(mes + 2).padStart(2, '0')}`
          return Array.from({ length: resto }, (_, i) => {
            const iso = `${proxMes}-${String(i + 1).padStart(2, '0')}`
            return renderDia(iso, true)
          })
        })()}
      </div>
    </div>
  )
}
