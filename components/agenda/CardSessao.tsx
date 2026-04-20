'use client'

import { Sessao } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ALTURA_SLOT, horaToPx } from './constants'

type Props = {
  sessao: Sessao
  cor: string
  onClick: () => void
}

// Card de sessão posicionado absolutamente dentro da coluna da grade
export function CardSessao({ sessao: s, cor, onClick }: Props) {
  const topo = s.hora ? horaToPx(s.hora) : 0

  // Calcula a duração: usa hora_fim se disponível, senão 30 min padrão
  let durMin = 30
  if (s.hora && s.hora_fim) {
    const [h1, m1] = s.hora.split(':').map(Number)
    const [h2, m2] = s.hora_fim.split(':').map(Number)
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (diff > 0) durMin = diff
  }
  const altura = Math.max((durMin / 30) * ALTURA_SLOT, 24)

  const realizada = s.status === 'realizada'
  const bloqueio = s.status === 'bloqueio'
  const lembrete = s.status === 'lembrete'

  const estiloBloqueio = bloqueio
    ? {
        background: `repeating-linear-gradient(
          45deg,
          #f3f4f6,
          #f3f4f6 4px,
          #e5e7eb 4px,
          #e5e7eb 8px
        )`,
      }
    : lembrete
      ? { backgroundColor: '#FEF9C3' }
      : { backgroundColor: `${cor}22` }

  return (
    <div
      className={cn(
        'absolute inset-x-0.5 rounded overflow-hidden cursor-pointer transition-shadow',
        realizada ? 'opacity-60' : 'hover:shadow-md',
      )}
      style={{
        top: topo + 1,
        height: altura - 2,
        borderLeft: `3px solid ${bloqueio ? '#9ca3af' : lembrete ? '#EAB308' : cor}`,
        ...estiloBloqueio,
      }}
      onClick={onClick}
    >
      <div className="px-1 pt-0.5 leading-tight overflow-hidden h-full">
        {bloqueio ? (
          <p className="text-[10px] font-medium text-gray-500">Bloqueado</p>
        ) : lembrete ? (
          <>
            <p className="text-[10px] font-medium text-yellow-800 truncate">📌 {s.item_nome}</p>
            {altura > 30 && s.responsavel_nome && (
              <p className="text-[9px] text-yellow-700 truncate">{s.responsavel_nome}</p>
            )}
          </>
        ) : (
          <>
            <p className={cn('text-[10px] font-medium text-gray-800 truncate', realizada && 'line-through')}>
              {s.procedimento_numero ? `#${s.procedimento_numero} — ` : ''}{s.cliente_nome}
            </p>
            {altura > 30 && (
              <p className="text-[10px] text-gray-500 truncate">{s.item_nome}</p>
            )}
            {altura > 44 && s.numero_sessao && s.total_sessoes && (
              <p className="text-[9px] text-purple-600 font-medium">
                Sessão {s.numero_sessao}/{s.total_sessoes}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
