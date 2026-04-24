'use client'

import { useEffect, useRef } from 'react'
import { Sessao, Funcionaria } from '@/lib/supabase'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { CardSessao } from './CardSessao'
import { LinhaHoraAtual } from './LinhaHoraAtual'
import { ALTURA_HORA, ALTURA_GRADE, ALTURA_SLOT, NUM_SLOTS, HORA_INICIO, HORA_FIM, slotParaHora, corFuncionaria } from './constants'
import { hoje } from '@/lib/utils'

type Props = {
  data: string
  sessoes: Sessao[]
  funcionarias: Funcionaria[]
  funcionariasVisiveis: Set<string>
  onSlotClick: (data: string, hora: string, funcId: string) => void
  onSessaoClick: (sessao: Sessao) => void
}

const eHoje = (data: string) => data === hoje()

// Grade principal da view Dia com colunas separadas por funcionária
export function GradeDia({
  data,
  sessoes,
  funcionarias,
  funcionariasVisiveis,
  onSlotClick,
  onSessaoClick,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Ao montar, fazer scroll automático para o horário atual (ou 08:00 se antes das 8h)
  useEffect(() => {
    if (!scrollRef.current) return
    const agora = new Date()
    const hora = agora.getHours()
    const alvoHora = hora < 8 ? 8 : hora - 1
    const topo = alvoHora * ALTURA_HORA
    scrollRef.current.scrollTop = topo
  }, [])

  const funcVisiveis = funcionarias.filter((f) => funcionariasVisiveis.has(f.id))
  const isHoje = eHoje(data)

  // Agrupa sessões do dia por funcionária
  const sessoesDodia = sessoes.filter((s) => s.data === data)
  const soesPorFunc: Record<string, Sessao[]> = {}
  for (const f of funcVisiveis) {
    soesPorFunc[f.id] = sessoesDodia.filter((s) => s.funcionaria_id === f.id && s.hora)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho: label GMT + nomes das funcionárias */}
      <div className="flex flex-shrink-0 border-b bg-white sticky top-0 z-10">
        <div className="w-12 flex-shrink-0 flex items-end justify-center pb-1">
          <span className="text-[10px] text-gray-400">GMT-03</span>
        </div>
        {funcVisiveis.map((f) => (
          <div
            key={f.id}
            className="flex-1 min-w-[140px] border-l flex items-center gap-2 px-2 py-1.5"
          >
            <AvatarInitiais nome={f.nome} tamanho={28} />
            <span className="text-xs font-medium text-gray-700 truncate">{f.nome}</span>
          </div>
        ))}
        {funcVisiveis.length === 0 && (
          <div className="flex-1 flex items-center px-4 py-2">
            <span className="text-xs text-gray-400">Nenhuma funcionária selecionada</span>
          </div>
        )}
      </div>

      {/* Corpo com scroll vertical */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-auto">
        <div
          className="relative flex"
          style={{ height: ALTURA_GRADE, minWidth: `${48 + funcVisiveis.length * 140}px` }}
        >
          {/* Coluna de horários — label centralizado dentro de cada slot */}
          <div className="w-12 flex-shrink-0 relative">
            {Array.from({ length: NUM_SLOTS }, (_, i) => {
              const meia = i % 2 !== 0
              return (
                <div
                  key={i}
                  className={`absolute right-2 select-none ${meia ? 'text-[11px] text-gray-400' : 'text-[11px] text-gray-600'}`}
                  style={{ top: i * ALTURA_SLOT + ALTURA_SLOT / 2, transform: 'translateY(-50%)' }}
                >
                  {slotParaHora(i)}
                </div>
              )
            })}
          </div>

          {/* Colunas por funcionária */}
          {funcVisiveis.map((f, idx) => {
            const cor = corFuncionaria(idx)
            return (
              <div key={f.id} className="flex-1 min-w-[140px] border-l relative">
                {/* Linhas de grade (hora cheia e meia hora) */}
                {Array.from({ length: NUM_SLOTS }, (_, i) => (
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

                {/* Áreas clicáveis para criar agendamento */}
                {Array.from({ length: NUM_SLOTS }, (_, i) => (
                  <div
                    key={`slot-${i}`}
                    className="absolute inset-x-0 cursor-pointer hover:bg-purple-100/60 transition-colors"
                    style={{ top: i * ALTURA_SLOT, height: ALTURA_SLOT }}
                    onClick={() => onSlotClick(data, slotParaHora(i), f.id)}
                  />
                ))}

                {/* Cards das sessões */}
                {soesPorFunc[f.id]?.map((s) => (
                  <CardSessao
                    key={s.id}
                    sessao={s}
                    cor={cor}
                    onClick={() => onSessaoClick(s)}
                  />
                ))}
              </div>
            )
          })}

          {/* Linha vermelha do horário atual (apenas se for hoje) */}
          {isHoje && <LinhaHoraAtual />}
        </div>
      </div>
    </div>
  )
}
