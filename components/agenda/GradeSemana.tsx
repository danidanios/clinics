'use client'

import { useEffect, useRef } from 'react'
import { Sessao, Funcionaria } from '@/lib/supabase'
import { CardSessao } from './CardSessao'
import { LinhaHoraAtual } from './LinhaHoraAtual'
import { ALTURA_HORA, ALTURA_GRADE, ALTURA_SLOT, slotParaHora, corFuncionaria } from './constants'
import { hoje } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Props = {
  dataBase: string
  sessoes: Sessao[]
  funcionarias: Funcionaria[]
  onSlotClick: (data: string, hora: string) => void
  onSessaoClick: (sessao: Sessao) => void
}

function dataISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function adicionarDias(data: string, n: number): string {
  const d = new Date(data + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return dataISO(d)
}

function inicioSemana(data: string): string {
  const d = new Date(data + 'T00:00:00')
  d.setDate(d.getDate() - d.getDay())
  return dataISO(d)
}

const DIAS_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HORAS = Array.from({ length: 24 }, (_, i) => i)

// Grade da view Semana: uma coluna por dia, sem divisão por funcionária
export function GradeSemana({
  dataBase,
  sessoes,
  funcionarias,
  onSlotClick,
  onSessaoClick,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inicio = inicioSemana(dataBase)
  const dias = Array.from({ length: 7 }, (_, i) => adicionarDias(inicio, i))
  const dataHoje = hoje()

  useEffect(() => {
    if (!scrollRef.current) return
    const agora = new Date()
    const hora = agora.getHours()
    const alvo = hora < 8 ? 8 : hora - 1
    scrollRef.current.scrollTop = alvo * ALTURA_HORA
  }, [])

  // Mapeia funcionária → índice para obter cor
  const corPorFunc: Record<string, string> = {}
  funcionarias.forEach((f, idx) => {
    corPorFunc[f.id] = corFuncionaria(idx)
  })

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho dos dias */}
      <div className="flex flex-shrink-0 border-b bg-white sticky top-0 z-10">
        <div className="w-12 flex-shrink-0 flex items-end justify-center pb-1">
          <span className="text-[10px] text-gray-400">GMT-03</span>
        </div>
        {dias.map((d, i) => {
          const dObj = new Date(d + 'T00:00:00')
          const num = dObj.getDate()
          const eHoje = d === dataHoje
          return (
            <div key={d} className="flex-1 border-l flex flex-col items-center py-1">
              <span className="text-[10px] text-gray-500">{DIAS_ABREV[i]}</span>
              <span
                className={cn(
                  'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full',
                  eHoje ? 'bg-[#7C3AED] text-white' : 'text-gray-800',
                )}
              >
                {num}
              </span>
            </div>
          )
        })}
      </div>

      {/* Corpo com scroll */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: ALTURA_GRADE }}>
          {/* Coluna de horários — label a cada 30 minutos */}
          <div className="w-12 flex-shrink-0 relative">
            {Array.from({ length: 48 }, (_, i) => {
              if (i === 0) return null
              const h = Math.floor(i / 2)
              const meia = i % 2 !== 0
              return (
                <div
                  key={i}
                  className={`absolute right-2 select-none ${meia ? 'text-[9px] text-gray-500' : 'text-[10px] text-gray-700'}`}
                  style={{ top: i * ALTURA_SLOT - 7 }}
                >
                  {meia
                    ? `${String(h).padStart(2, '0')}:30`
                    : `${String(h).padStart(2, '0')}:00`}
                </div>
              )
            })}
          </div>

          {/* Colunas dos dias */}
          {dias.map((d) => {
            const sessDia = sessoes.filter((s) => s.data === d && s.hora)
            const eHoje = d === dataHoje
            return (
              <div key={d} className="flex-1 border-l relative">
                {/* Linhas de grade */}
                {Array.from({ length: 48 }, (_, i) => (
                  <div
                    key={i}
                    className={
                      i % 2 === 0
                        ? 'absolute inset-x-0 border-t border-gray-200'
                        : 'absolute inset-x-0 border-t border-dashed border-gray-200'
                    }
                    style={{ top: i * ALTURA_SLOT }}
                  />
                ))}

                {/* Áreas clicáveis */}
                {Array.from({ length: 48 }, (_, i) => (
                  <div
                    key={`slot-${i}`}
                    className="absolute inset-x-0 cursor-pointer hover:bg-purple-50/50"
                    style={{ top: i * ALTURA_SLOT, height: ALTURA_SLOT }}
                    onClick={() => onSlotClick(d, slotParaHora(i))}
                  />
                ))}

                {/* Cards das sessões */}
                {sessDia.map((s) => (
                  <CardSessao
                    key={s.id}
                    sessao={s}
                    cor={corPorFunc[s.funcionaria_id || ''] || '#7C3AED'}
                    onClick={() => onSessaoClick(s)}
                  />
                ))}

                {/* Linha do horário atual nesta coluna */}
                {eHoje && <LinhaHoraAtual />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
