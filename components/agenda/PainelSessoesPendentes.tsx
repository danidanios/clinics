'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase, Sessao } from '@/lib/supabase'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  aberto: boolean
  onFechar: () => void
  onAgendar: (sessao: Sessao) => void
  // Incrementar para forçar recarga (ex: após agendar uma sessão)
  versao: number
  onContarPendentes: (total: number) => void
}

type GrupoPacote = {
  chave: string
  procedimento_id?: string
  procedimento_numero?: string
  cliente_nome: string
  item_nome: string
  sessoes: Sessao[]
}

function normalizar(s: string | undefined | null): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Drawer sobreposto com sessões pendentes agrupadas por pacote (procedimento)
export function PainelSessoesPendentes({ aberto, onFechar, onAgendar, versao, onContarPendentes }: Props) {
  const [grupos, setGrupos] = useState<GrupoPacote[]>([])
  const [total, setTotal] = useState(0)
  const [busca, setBusca] = useState('')
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())

  async function carregar() {
    const { data } = await supabase
      .from('sessoes')
      .select('*')
      .eq('status', 'pendente')
      .order('numero_sessao', { ascending: true, nullsFirst: true })

    const sessoes = (data || []) as Sessao[]
    setTotal(sessoes.length)
    onContarPendentes(sessoes.length)

    // Agrupa por procedimento_id (pacote). Fallback para cliente_nome quando não houver.
    const mapa = new Map<string, GrupoPacote>()
    for (const s of sessoes) {
      const chave = s.procedimento_id || `cliente:${s.cliente_nome || 'sem-cliente'}`
      const existente = mapa.get(chave)
      if (existente) {
        existente.sessoes.push(s)
      } else {
        mapa.set(chave, {
          chave,
          procedimento_id: s.procedimento_id,
          procedimento_numero: s.procedimento_numero,
          cliente_nome: s.cliente_nome || 'Sem cliente',
          item_nome: s.item_nome || '',
          sessoes: [s],
        })
      }
    }
    setGrupos(Array.from(mapa.values()))
  }

  useEffect(() => { carregar() }, [versao])

  // Filtra grupos pela busca (cliente_nome, item_nome ou procedimento_numero)
  const gruposFiltrados = useMemo(() => {
    const termo = normalizar(busca).trim()
    if (!termo) return grupos
    return grupos.filter((g) =>
      normalizar(g.cliente_nome).includes(termo) ||
      normalizar(g.item_nome).includes(termo) ||
      normalizar(g.procedimento_numero).includes(termo),
    )
  }, [grupos, busca])

  function toggleColapso(chave: string) {
    setColapsados((prev) => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }

  // Quando há busca ativa, força todos os grupos filtrados a ficarem expandidos
  const buscaAtiva = busca.trim().length > 0

  return (
    <Sheet open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 gap-0 flex flex-col"
      >
        <SheetHeader className="gap-3 border-b p-4 pr-12">
          <SheetTitle className="flex items-center gap-2">
            Sessões a agendar
            {total > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-0">
                {total}
              </Badge>
            )}
          </SheetTitle>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por cliente, procedimento ou #..."
              className="pl-8 h-9"
            />
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          {gruposFiltrados.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {buscaAtiva
                ? 'Nenhum resultado para esta busca'
                : 'Nenhuma sessão pendente 🎉'}
            </div>
          ) : (
            <div className="divide-y">
              {gruposFiltrados.map((g) => {
                const expandido = buscaAtiva || !colapsados.has(g.chave)
                return (
                  <div key={g.chave}>
                    <button
                      type="button"
                      onClick={() => toggleColapso(g.chave)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <AvatarInitiais nome={g.cliente_nome} tamanho={36} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-800">{g.cliente_nome}</span>
                          {g.procedimento_numero && (
                            <span className="text-xs text-gray-500 font-medium">#{g.procedimento_numero}</span>
                          )}
                        </div>
                        {g.item_nome && (
                          <div className="text-xs text-gray-600 mt-0.5">{g.item_nome}</div>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {g.sessoes.length}
                      </Badge>
                      <ChevronDown
                        size={16}
                        className={cn(
                          'shrink-0 text-gray-400 transition-transform',
                          expandido && 'rotate-180',
                        )}
                      />
                    </button>

                    {expandido && (
                      <div className="pb-3 space-y-2">
                        {g.sessoes.map((s) => (
                          <div
                            key={s.id}
                            className="mx-4 ml-12 rounded-lg border border-purple-100 bg-purple-50/40 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {s.numero_sessao && s.total_sessoes ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  Sessão {s.numero_sessao}/{s.total_sessoes}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">Sessão avulsa</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-800 leading-snug">{s.item_nome || '—'}</p>
                            <Button
                              size="sm"
                              className="w-full h-8 bg-[#7C3AED] hover:bg-purple-700 text-white text-xs"
                              onClick={() => onAgendar(s)}
                            >
                              Agendar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
