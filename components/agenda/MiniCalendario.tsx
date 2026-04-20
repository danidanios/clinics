'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Funcionaria } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { hoje } from '@/lib/utils'
import { DIAS_SEMANA_ABREV, MESES_PT, corFuncionaria } from './constants'

type Props = {
  dataBase: string
  onSelectData: (data: string) => void
  funcionarias: Funcionaria[]
  funcionariasVisiveis: Set<string>
  onToggleFuncionaria: (id: string) => void
}

// Mini calendário lateral + checkboxes das funcionárias
export function MiniCalendario({
  dataBase,
  onSelectData,
  funcionarias,
  funcionariasVisiveis,
  onToggleFuncionaria,
}: Props) {
  const [mesRef, setMesRef] = useState(() => dataBase.substring(0, 7))
  // Ordem local das funcionárias (permite arrastar para reordenar)
  const [ordemFuncionarias, setOrdemFuncionarias] = useState<Funcionaria[]>(funcionarias)
  const dragIndex = useRef<number | null>(null)

  // Sincroniza quando a prop funcionarias mudar (ex: carregamento inicial)
  useEffect(() => {
    setOrdemFuncionarias(funcionarias)
  }, [funcionarias])

  const ano = parseInt(mesRef.substring(0, 4))
  const mes = parseInt(mesRef.substring(5, 7)) - 1

  // Dias do mês + padding inicial (domingo = 0)
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()

  function navegarMes(delta: number) {
    const d = new Date(ano, mes + delta, 1)
    setMesRef(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function dataISO(dia: number): string {
    return `${mesRef}-${String(dia).padStart(2, '0')}`
  }

  const dataHoje = hoje()

  return (
    <div className="w-56 flex-shrink-0 border-r bg-white flex flex-col overflow-y-auto">
      {/* Cabeçalho do mês */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-xs font-medium text-gray-700">
          {MESES_PT[mes]} {ano}
        </span>
        <div className="flex gap-0.5">
          <button onClick={() => navegarMes(-1)} className="rounded p-0.5 hover:bg-gray-100">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => navegarMes(1)} className="rounded p-0.5 hover:bg-gray-100">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Grade do mini calendário */}
      <div className="px-2 pb-2">
        {/* Cabeçalho dos dias */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA_ABREV.map((d) => (
            <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-0.5">
              {d.charAt(0)}
            </div>
          ))}
        </div>

        {/* Células dos dias */}
        <div className="grid grid-cols-7">
          {/* Espaços vazios antes do primeiro dia */}
          {Array.from({ length: primeiroDia }, (_, i) => (
            <div key={`v-${i}`} />
          ))}
          {Array.from({ length: ultimoDia }, (_, i) => {
            const dia = i + 1
            const iso = dataISO(dia)
            const eHoje = iso === dataHoje
            const eSelecionado = iso === dataBase && !eHoje
            return (
              <button
                key={dia}
                onClick={() => onSelectData(iso)}
                className={cn(
                  'flex h-6 w-6 mx-auto items-center justify-center rounded-full text-[11px] transition-colors',
                  eHoje && 'bg-[#7C3AED] text-white font-semibold',
                  eSelecionado && !eHoje && 'bg-gray-200 text-gray-800',
                  !eHoje && !eSelecionado && 'hover:bg-gray-100 text-gray-700',
                )}
              >
                {dia}
              </button>
            )
          })}
        </div>
      </div>

      {/* Separador */}
      <div className="border-t mx-2" />

      {/* Lista de funcionárias com checkboxes (arrastar para reordenar) */}
      <div className="px-3 py-2 space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Funcionárias
        </p>
        {ordemFuncionarias.map((f, idx) => {
          const cor = corFuncionaria(idx)
          const visivel = funcionariasVisiveis.has(f.id)
          return (
            <label
              key={f.id}
              draggable
              onDragStart={() => { dragIndex.current = idx }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => {
                const from = dragIndex.current
                if (from === null || from === idx) return
                const nova = [...ordemFuncionarias]
                const [item] = nova.splice(from, 1)
                nova.splice(idx, 0, item)
                setOrdemFuncionarias(nova)
                dragIndex.current = null
              }}
              onDragEnd={() => { dragIndex.current = null }}
              className="flex items-center gap-2 cursor-grab active:cursor-grabbing group"
            >
              <input
                type="checkbox"
                checked={visivel}
                onChange={() => onToggleFuncionaria(f.id)}
                className="sr-only"
              />
              {/* Checkbox customizado com a cor da funcionária */}
              <div
                className={cn(
                  'h-3.5 w-3.5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors',
                )}
                style={{
                  borderColor: cor,
                  backgroundColor: visivel ? cor : 'transparent',
                }}
              >
                {visivel && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-xs text-gray-700 group-hover:text-gray-900 truncate">
                {f.nome}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
