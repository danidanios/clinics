'use client'

import { useEffect, useState } from 'react'
import { supabase, Sessao } from '@/lib/supabase'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  aberto: boolean
  onFechar: () => void
  onAgendar: (sessao: Sessao) => void
  // Incrementar para forçar recarga (ex: após agendar uma sessão)
  versao: number
  onContarPendentes: (total: number) => void
}

type GrupoCliente = {
  cliente_nome: string
  sessoes: Sessao[]
}

// Painel lateral retrátil que lista sessões com status 'pendente' (sem data)
export function PainelSessoesPendentes({ aberto, onFechar, onAgendar, versao, onContarPendentes }: Props) {
  const [grupos, setGrupos] = useState<GrupoCliente[]>([])
  const [total, setTotal] = useState(0)

  async function carregar() {
    const { data } = await supabase
      .from('sessoes')
      .select('*')
      .eq('status', 'pendente')
      .order('procedimento_numero', { ascending: true })

    const sessoes = (data || []) as Sessao[]
    setTotal(sessoes.length)
    onContarPendentes(sessoes.length)

    // Agrupa por cliente
    const mapa: Record<string, Sessao[]> = {}
    for (const s of sessoes) {
      const nome = s.cliente_nome || 'Sem cliente'
      if (!mapa[nome]) mapa[nome] = []
      mapa[nome].push(s)
    }
    setGrupos(Object.entries(mapa).map(([nome, sess]) => ({ cliente_nome: nome, sessoes: sess })))
  }

  useEffect(() => { carregar() }, [versao])

  return (
    <div
      className={cn(
        'flex flex-col border-l bg-white transition-all duration-200 overflow-hidden flex-shrink-0',
        aberto ? 'w-72' : 'w-0',
      )}
    >
      {/* Cabeçalho do painel */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 min-w-[288px]">
        <span className="text-sm font-semibold text-gray-700">
          Sessões a agendar
          {total > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-bold">
              {total}
            </span>
          )}
        </span>
        <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Lista de sessões pendentes agrupadas por cliente */}
      <ScrollArea className="flex-1 min-w-[288px]">
        <div className="p-3 space-y-4">
          {grupos.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Nenhuma sessão pendente 🎉
            </div>
          ) : grupos.map((g) => (
            <div key={g.cliente_nome}>
              {/* Cabeçalho do cliente */}
              <div className="flex items-center gap-2 mb-2">
                <AvatarInitiais nome={g.cliente_nome} tamanho={28} />
                <span className="text-sm font-semibold text-gray-800 truncate">{g.cliente_nome}</span>
              </div>

              {/* Sessões do cliente */}
              <div className="ml-9 space-y-2">
                {g.sessoes.map((s) => (
                  <div key={s.id} className="rounded-lg border bg-gray-50 p-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      {s.numero_sessao && s.total_sessoes && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          Sessão {s.numero_sessao}/{s.total_sessoes}
                        </Badge>
                      )}
                      {s.procedimento_numero && (
                        <span className="text-[10px] text-gray-400">#{s.procedimento_numero}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 font-medium truncate">{s.item_nome}</p>
                    <Button
                      size="sm"
                      className="w-full h-7 text-[11px] bg-[#7C3AED] hover:bg-purple-700 text-white"
                      onClick={() => onAgendar(s)}
                    >
                      Agendar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
