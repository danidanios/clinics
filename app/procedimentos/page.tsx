'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/PageHeader'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { EstadoVazio } from '@/components/shared/EstadoVazio'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { supabase, Procedimento, Cliente, Servico, Pacote } from '@/lib/supabase'
import { formatarMoeda, gerarId, formatarNumero, hoje } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Search, Edit2, XCircle } from 'lucide-react'

type FormaPag = 'pix' | 'dinheiro' | 'debito' | 'credito' | 'parcelado'

export default function ProcedimentosPage() {
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editProc, setEditProc] = useState<Procedimento | null>(null)
  // Guarda o status original ao abrir edição (para detectar mudança para 'pago')
  const [editProcStatusOriginal, setEditProcStatusOriginal] = useState<string>('')
  const [cancelarProcId, setCancelarProcId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Form novo procedimento
  const [clienteId, setClienteId] = useState('')
  const [tipo, setTipo] = useState<'servico' | 'pacote'>('servico')
  const [itemId, setItemId] = useState('')
  const [valorOriginal, setValorOriginal] = useState(0)
  const [comDesconto, setComDesconto] = useState(false)
  const [descontoTipo, setDescontoTipo] = useState<'pct' | 'valor'>('pct')
  const [descontoVal, setDescontoVal] = useState(0)
  const [valorFinal, setValorFinal] = useState(0)
  const [formaPag, setFormaPag] = useState<FormaPag>('pix')
  const [parcelas, setParcelas] = useState(1)
  const [obs, setObs] = useState('')
  // Pacote retroativo: cliente já iniciou o pacote antes do sistema
  const [pacoteRetroativo, setPacoteRetroativo] = useState(false)
  const [sessoesJaRealizadas, setSessoesJaRealizadas] = useState(1)
  // Busca estilo agenda: inputs com dropdown customizado para cliente e serviço/pacote
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaItem, setBuscaItem] = useState('')
  const [clienteDropAberto, setClienteDropAberto] = useState(false)
  const [itemDropAberto, setItemDropAberto] = useState(false)

  const carregar = useCallback(async () => {
    // Filtra procedimentos não cancelados
    const { data } = await supabase
      .from('procedimentos')
      .select('*')
      .or('cancelado.is.null,cancelado.eq.false')
      .order('criado_em', { ascending: false })
    setProcedimentos(data || [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('*').eq('ativo', true).order('nome'),
      supabase.from('servicos').select('*').order('nome'),
      supabase.from('pacotes').select('*').order('nome'),
    ]).then(([{ data: c }, { data: s }, { data: p }]) => {
      setClientes(c || [])
      setServicos(s || [])
      setPacotes(p || [])
    })
  }, [])

  // Recalcular valor final em tempo real
  useEffect(() => {
    if (!comDesconto) { setValorFinal(valorOriginal); return }
    if (descontoTipo === 'pct') {
      setValorFinal(valorOriginal - valorOriginal * descontoVal / 100)
    } else {
      setValorFinal(valorOriginal - descontoVal)
    }
  }, [valorOriginal, comDesconto, descontoTipo, descontoVal])

  function selecionarItem(id: string) {
    setItemId(id)
    if (tipo === 'servico') {
      const s = servicos.find(s => s.id === id)
      setValorOriginal(s?.custo_geral || 0)
    } else {
      const p = pacotes.find(p => p.id === id)
      setValorOriginal(p?.preco_total || 0)
    }
  }

  async function proximoNumero(): Promise<string> {
    const { data } = await supabase.from('procedimentos').select('numero').order('numero', { ascending: false }).limit(1)
    const ultimo = data?.[0]?.numero ? parseInt(data[0].numero) : 0
    return formatarNumero(ultimo + 1)
  }

  async function salvarProcedimento() {
    if (!clienteId || !itemId) { toast.error('Selecione cliente e serviço/pacote.'); return }
    setSalvando(true)
    const numero = await proximoNumero()
    const cliente = clientes.find(c => c.id === clienteId)
    let itemNome = ''
    if (tipo === 'servico') itemNome = servicos.find(s => s.id === itemId)?.nome || ''
    else itemNome = pacotes.find(p => p.id === itemId)?.nome || ''

    const procId = gerarId()
    const descPct = comDesconto && descontoTipo === 'pct' ? descontoVal : 0
    const descValor = comDesconto && descontoTipo === 'valor' ? descontoVal : 0

    const { error } = await supabase.from('procedimentos').insert({
      id: procId, numero,
      cliente_id: clienteId, cliente_nome: cliente?.nome || '',
      tipo, item_id: itemId, item_nome: itemNome,
      desconto_pct: descPct, desconto_valor: descValor,
      valor_original: valorOriginal, valor_final: valorFinal,
      status_pagamento: 'pendente', forma_pagamento: formaPag,
      parcelas: formaPag === 'parcelado' ? parcelas : 1,
      valor_pago: 0, observacoes: obs || null,
      cancelado: false,
    })
    if (error) { toast.error('Erro ao salvar.'); setSalvando(false); return }

    // Gerar sessões conforme o tipo
    if (tipo === 'pacote') {
      const p = pacotes.find(p => p.id === itemId)
      const numSessoes = p?.num_sessoes || 1
      const sessInserts = Array.from({ length: numSessoes }, (_, i) => ({
        id: gerarId(),
        procedimento_id: procId,
        procedimento_numero: numero,
        cliente_id: clienteId,
        cliente_nome: cliente?.nome || '',
        item_nome: itemNome,
        valor_servico: valorFinal / numSessoes,
        data: null,
        hora: null,
        // Pacote retroativo: primeiras X sessões ficam como realizadas (histórico),
        // restantes ficam pendentes para serem agendadas normalmente
        status: (pacoteRetroativo && i < sessoesJaRealizadas) ? 'realizada' : 'pendente',
        comissao_pct: 0,
        comissao_valor: 0,
        custo_produto: 0,
        numero_sessao: i + 1,
        total_sessoes: numSessoes,
      }))
      await supabase.from('sessoes').insert(sessInserts)
    } else {
      await supabase.from('sessoes').insert({
        id: gerarId(),
        procedimento_id: procId,
        procedimento_numero: numero,
        cliente_id: clienteId,
        cliente_nome: cliente?.nome || '',
        item_nome: itemNome,
        valor_servico: valorFinal,
        data: null,
        hora: null,
        status: 'agendada',
        comissao_pct: 0,
        comissao_valor: 0,
        custo_produto: 0,
      })
    }

    if (pacoteRetroativo && tipo === 'pacote') {
      const n = pacotes.find(p => p.id === itemId)?.num_sessoes || 0
      const pendentes = Math.max(0, n - sessoesJaRealizadas)
      toast.success(
        `Procedimento #${numero} registrado: ${sessoesJaRealizadas} realizada(s), ${pendentes} pendente(s).`,
      )
    } else {
      toast.success(`Procedimento #${numero} — ${cliente?.nome} registrado!`)
    }
    setModalAberto(false)
    resetForm()
    setSalvando(false)
    carregar()
  }

  // Soft delete: marca procedimento e todos os vinculados como cancelados
  async function cancelarProcedimento() {
    if (!cancelarProcId) return
    const agora = new Date().toISOString()

    // Busca IDs das sessões para cancelar comissões via sessao_id (não depende de procedimento_id em comissoes)
    const { data: sessoesProc } = await supabase
      .from('sessoes').select('id').eq('procedimento_id', cancelarProcId)
    const sessaoIds = (sessoesProc || []).map(s => s.id)

    await supabase.from('sessoes')
      .update({ status: 'cancelada' })
      .eq('procedimento_id', cancelarProcId)
    await supabase.from('lancamentos')
      .update({ cancelado: true })
      .eq('procedimento_id', cancelarProcId)
    if (sessaoIds.length > 0) {
      await supabase.from('comissoes')
        .update({ status: 'cancelada' })
        .in('sessao_id', sessaoIds)
    }
    const { error } = await supabase.from('procedimentos')
      .update({ cancelado: true, cancelado_em: agora })
      .eq('id', cancelarProcId)
    setCancelarProcId(null)
    if (error) { toast.error('Erro ao cancelar.'); return }
    toast.success('Procedimento cancelado.')
    carregar()
  }

  async function salvarEdicao() {
    if (!editProc) return
    setSalvando(true)

    // Se status mudou para 'pago', gera lançamento financeiro
    const mudouParaPago = editProcStatusOriginal !== 'pago' && editProc.status_pagamento === 'pago'
    const mudouDePago = editProcStatusOriginal === 'pago' && editProc.status_pagamento !== 'pago'

    await supabase.from('procedimentos').update({
      desconto_pct: editProc.desconto_pct,
      desconto_valor: editProc.desconto_valor,
      valor_final: editProc.valor_final,
      status_pagamento: editProc.status_pagamento,
      forma_pagamento: editProc.forma_pagamento,
      observacoes: editProc.observacoes,
    }).eq('id', editProc.id)

    if (mudouParaPago) {
      await supabase.from('lancamentos').insert({
        id: gerarId(),
        data: hoje(),
        tipo: 'entrada',
        descricao: `Procedimento #${editProc.numero} — ${editProc.item_nome} — ${editProc.cliente_nome}`,
        valor: editProc.valor_final,
        conta: 'cnpj',
        categoria: 'Procedimento',
        procedimento_id: editProc.id,
        cancelado: false,
      })
      toast.success('Pagamento registrado e lançamento financeiro gerado!')
    } else if (mudouDePago) {
      await supabase.from('lancamentos').update({ cancelado: true }).eq('procedimento_id', editProc.id)
      toast.success('Pagamento revertido. Lançamento financeiro cancelado.')
    } else {
      toast.success('Procedimento atualizado!')
    }

    setEditProc(null)
    setSalvando(false)
    carregar()
  }

  function abrirEdicao(p: Procedimento) {
    setEditProc(p)
    setEditProcStatusOriginal(p.status_pagamento)
  }

  function resetForm() {
    setClienteId(''); setItemId(''); setValorOriginal(0); setComDesconto(false)
    setDescontoVal(0); setFormaPag('pix'); setParcelas(1); setObs('')
    setTipo('servico')
    setPacoteRetroativo(false); setSessoesJaRealizadas(1)
    setBuscaCliente(''); setBuscaItem('')
    setClienteDropAberto(false); setItemDropAberto(false)
  }

  const filtrados = procedimentos.filter(p =>
    !busca || (p.cliente_nome || '').toLowerCase().includes(busca.toLowerCase())
  )

  const badgeStatus = (s: string) => {
    if (s === 'pago') return <Badge className="bg-green-600 text-white text-xs">Pago</Badge>
    if (s === 'parcial') return <Badge className="bg-amber-500 text-white text-xs">Parcial</Badge>
    return <Badge variant="destructive" className="text-xs">Pendente</Badge>
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Procedimentos"
        acoes={
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setModalAberto(true)}>
            <Plus size={14} className="mr-1" /> Novo
          </Button>
        }
      />

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Buscar por cliente..." className="pl-8" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {filtrados.length === 0 ? <EstadoVazio mensagem="Nenhum procedimento encontrado." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(p => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AvatarInitiais nome={p.cliente_nome || '?'} tamanho={32} />
                    <div>
                      <p className="text-xs text-gray-400">#{p.numero}</p>
                      <p className="text-sm font-medium">{p.cliente_nome}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEdicao(p)} className="text-gray-400 hover:text-purple-600">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setCancelarProcId(p.id)} className="text-gray-400 hover:text-red-500" title="Cancelar procedimento">
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 truncate">{p.item_nome}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{formatarMoeda(p.valor_final)}</span>
                  {badgeStatus(p.status_pagamento)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal novo procedimento */}
      <Dialog open={modalAberto} onOpenChange={v => { if (!v) resetForm(); setModalAberto(v) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader><DialogTitle>Novo procedimento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Cliente — busca com dropdown */}
            <div className="space-y-1">
              <Label>Cliente</Label>
              <div className="relative">
                <Input
                  placeholder="Buscar cliente..."
                  value={buscaCliente}
                  onChange={e => { setBuscaCliente(e.target.value); setClienteId(''); setClienteDropAberto(true) }}
                  onFocus={() => setClienteDropAberto(true)}
                  onBlur={() => setTimeout(() => setClienteDropAberto(false), 150)}
                />
                {clienteDropAberto && (() => {
                  const termo = buscaCliente.toLowerCase()
                  const lista = clientes
                    .filter(c => !termo || (c.nome || '').toLowerCase().includes(termo))
                    .slice(0, 20)
                  if (lista.length === 0) return null
                  return (
                    <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-md divide-y divide-gray-200">
                      {lista.map(c => (
                        <button
                          key={c.id}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                          onMouseDown={() => { setClienteId(c.id); setBuscaCliente(c.nome); setClienteDropAberto(false) }}
                        >
                          {c.nome}
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            <div className="flex rounded-lg border bg-gray-50 p-1">
              {(['servico', 'pacote'] as const).map(t => (
                <button key={t} onClick={() => { setTipo(t); setItemId(''); setValorOriginal(0); setBuscaItem('') }}
                  className={`flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors ${tipo === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
                  {t === 'servico' ? 'Serviço' : 'Pacote'}
                </button>
              ))}
            </div>

            {/* Item — busca com dropdown */}
            <div className="space-y-1">
              <Label>{tipo === 'servico' ? 'Serviço' : 'Pacote'}</Label>
              <div className="relative">
                <Input
                  placeholder={`Buscar ${tipo === 'servico' ? 'serviço' : 'pacote'}...`}
                  value={buscaItem}
                  onChange={e => { setBuscaItem(e.target.value); setItemId(''); setItemDropAberto(true) }}
                  onFocus={() => setItemDropAberto(true)}
                  onBlur={() => setTimeout(() => setItemDropAberto(false), 150)}
                />
                {itemDropAberto && (
                  <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border bg-white shadow-md divide-y divide-gray-200">
                    {tipo === 'servico'
                      ? servicos
                          .filter(s => !buscaItem || (s.nome || '').toLowerCase().includes(buscaItem.toLowerCase()))
                          .slice(0, 30)
                          .map(s => (
                            <button
                              key={s.id}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                              onMouseDown={() => { selecionarItem(s.id); setBuscaItem(s.nome); setItemDropAberto(false) }}
                            >
                              {s.nome}
                            </button>
                          ))
                      : pacotes
                          .filter(pac => !buscaItem || (pac.nome || '').toLowerCase().includes(buscaItem.toLowerCase()))
                          .slice(0, 30)
                          .map(pac => (
                            <button
                              key={pac.id}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                              onMouseDown={() => {
                                selecionarItem(pac.id)
                                setBuscaItem(`${pac.nome} · ${pac.num_sessoes} sessões · ${formatarMoeda(pac.preco_total)}`)
                                setItemDropAberto(false)
                              }}
                            >
                              {pac.nome} · {pac.num_sessoes} sessões · {formatarMoeda(pac.preco_total)}
                            </button>
                          ))}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <CurrencyInput value={valorOriginal} onChange={v => setValorOriginal(v)} disabled={tipo === 'pacote'} />
            </div>
            {tipo === 'pacote' && itemId && (() => {
              const nSess = pacotes.find(p => p.id === itemId)?.num_sessoes || 1
              return (
                <>
                  <div className="flex items-center gap-2">
                    <Switch checked={pacoteRetroativo} onCheckedChange={setPacoteRetroativo} />
                    <Label>Pacote já iniciado (registro retroativo)</Label>
                  </div>
                  {pacoteRetroativo && (
                    <div className="space-y-1 rounded-lg bg-purple-50 border border-purple-200 p-3">
                      <Label>Sessões já realizadas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={nSess}
                        value={sessoesJaRealizadas}
                        onChange={e => setSessoesJaRealizadas(
                          Math.max(1, Math.min(nSess, Number(e.target.value) || 1)),
                        )}
                      />
                      <p className="text-xs text-purple-700">
                        As {sessoesJaRealizadas} primeiras ficam marcadas como realizadas.
                        As {Math.max(0, nSess - sessoesJaRealizadas)} restantes ficam pendentes para agendar.
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
            <div className="flex items-center gap-2">
              <Switch checked={comDesconto} onCheckedChange={setComDesconto} />
              <Label>Aplicar desconto</Label>
            </div>
            {comDesconto && (
              <div className="space-y-2">
                <div className="flex rounded-lg border bg-gray-50 p-0.5">
                  {(['pct', 'valor'] as const).map(t => (
                    <button key={t} onClick={() => { setDescontoTipo(t); setDescontoVal(0) }}
                      className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${descontoTipo === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
                      {t === 'pct' ? '%' : 'R$'}
                    </button>
                  ))}
                </div>
                {descontoTipo === 'pct'
                  ? <Input type="number" value={descontoVal} onChange={e => setDescontoVal(+e.target.value)} placeholder="Ex: 10" />
                  : <CurrencyInput value={descontoVal} onChange={setDescontoVal} />
                }
                <p className="text-xs text-purple-700">Valor final: {formatarMoeda(valorFinal)}</p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Forma de pagamento</Label>
              <Select value={formaPag} onValueChange={v => setFormaPag(v as FormaPag)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="parcelado">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formaPag === 'parcelado' && (
              <div className="space-y-1">
                <Label>Nº de parcelas</Label>
                <Input type="number" min={2} value={parcelas} onChange={e => setParcelas(+e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} />
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={salvarProcedimento} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar procedimento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal editar procedimento */}
      {editProc && (
        <Dialog open={!!editProc} onOpenChange={v => !v && setEditProc(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Editar #{editProc.numero} — {editProc.cliente_nome}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Valor final</Label>
                <CurrencyInput value={editProc.valor_final} onChange={v => setEditProc({ ...editProc, valor_final: v })} />
              </div>
              <div className="space-y-1">
                <Label>Status pagamento</Label>
                <Select value={editProc.status_pagamento} onValueChange={v => setEditProc({ ...editProc, status_pagamento: v as Procedimento['status_pagamento'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea value={editProc.observacoes || ''} onChange={e => setEditProc({ ...editProc, observacoes: e.target.value })} rows={2} />
              </div>
              {editProcStatusOriginal !== 'pago' && editProc.status_pagamento === 'pago' && (
                <p className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                  Ao salvar, um lançamento financeiro será gerado automaticamente.
                </p>
              )}
              <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={salvarEdicao} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de confirmação de cancelamento */}
      <ConfirmModal
        aberto={!!cancelarProcId}
        mensagem="Cancelar este procedimento? Todas as sessões, lançamentos e comissões vinculados serão marcados como cancelados. Esta ação não pode ser desfeita."
        onConfirmar={cancelarProcedimento}
        onCancelar={() => setCancelarProcId(null)}
      />
    </div>
  )
}
