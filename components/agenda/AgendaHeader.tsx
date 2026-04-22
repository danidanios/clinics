'use client'

import { ChevronLeft, ChevronRight, Plus, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type View = 'dia' | 'semana' | 'mes'

type Props = {
  view: View
  labelData: string
  onViewChange: (v: View) => void
  onNavegar: (delta: number) => void
  onHoje: () => void
  onAbrirModal: (tipo?: 'agendamento' | 'bloqueio' | 'lembrete') => void
  sessoesPendentes?: number
  onTogglePainel?: () => void
}

// Cabeçalho da agenda no estilo Google Calendar
export function AgendaHeader({ view, labelData, onViewChange, onNavegar, onHoje, onAbrirModal, sessoesPendentes = 0, onTogglePainel }: Props) {
  return (
    <div className="flex h-14 items-center justify-between border-b bg-white px-4 flex-shrink-0 gap-2">
      {/* Lado esquerdo: botões de ação */}
      <div className="flex items-center gap-2">
        {/* Botão "+ Criar" */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white shadow hover:bg-purple-700 transition-colors outline-none">
            <Plus size={16} />
            Criar
            <ChevronRight size={14} className="rotate-90" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onAbrirModal('agendamento')}>Agendamento</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAbrirModal('bloqueio')}>Bloqueio de horário</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAbrirModal('lembrete')}>Lembrete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bloco 8: botão "Sessões a agendar" mais destacado */}
        {onTogglePainel && (
          <button
            onClick={onTogglePainel}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors shadow ${
              sessoesPendentes > 0
                ? 'bg-[#7C3AED] text-white hover:bg-purple-700'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            <ClipboardList size={15} />
            {sessoesPendentes > 0 ? 'Sessões a agendar' : 'Nenhuma sessão pendente'}
            {sessoesPendentes > 0 && (
              <span className="rounded-full bg-white text-[#7C3AED] px-1.5 py-0.5 text-[11px] font-bold leading-none">
                {sessoesPendentes}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Centro: navegação de data */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-8 mr-4" onClick={onHoje}>Hoje</Button>
        <button onClick={() => onNavegar(-1)} className="rounded-full p-1 hover:bg-gray-100 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => onNavegar(1)} className="rounded-full p-1 hover:bg-gray-100 transition-colors">
          <ChevronRight size={18} />
        </button>
        <span className="min-w-[22rem] text-center text-base font-medium text-gray-800">{labelData}</span>
      </div>

      {/* Lado direito: seletor de view */}
      <Select value={view} onValueChange={(v) => onViewChange(v as View)}>
        <SelectTrigger className="w-28 h-8">
          <SelectValue>{view === 'dia' ? 'Dia' : view === 'semana' ? 'Semana' : 'Mês'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dia">Dia</SelectItem>
          <SelectItem value="semana">Semana</SelectItem>
          <SelectItem value="mes">Mês</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
