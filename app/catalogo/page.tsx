'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { EstadoVazio } from '@/components/shared/EstadoVazio'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { supabase, Servico, Pacote } from '@/lib/supabase'
import { formatarMoeda, gerarId } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

type ItemCusto = { descricao: string; fornecedor: string; valor: number }
type ItemPacote = { descricao: string; quantidade: number; valor_unit: number }

export default function CatalogoPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [abrirServicos, setAbrirServicos] = useState(true)
  const [abrirPacotes, setAbrirPacotes] = useState(true)

  // Modal serviço
  const [modalServico, setModalServico] = useState(false)
  const [editServico, setEditServico] = useState<Servico | null>(null)
  const [snome, setSnome] = useState('')
  const [sduracao, setSduracao] = useState(30)
  const [sPreco, setSpreco] = useState(0)
  const [scustos, setScustos] = useState<ItemCusto[]>([])

  // Modal pacote
  const [modalPacote, setModalPacote] = useState(false)
  const [editPacote, setEditPacote] = useState<Pacote | null>(null)
  const [pnome, setPnome] = useState('')
  const [pSessoes, setPSessoes] = useState(1)
  const [pitens, setPitens] = useState<ItemPacote[]>([])
  const [pPreco, setPpreco] = useState(0)
  const [pObs, setPobs] = useState('')
  const [pServicoId, setPServicoId] = useState('')

  const [excluirServId, setExcluirServId] = useState<string | null>(null)
  const [excluirPacId, setExcluirPacId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('servicos').select('*').order('nome'),
      supabase.from('pacotes').select('*').order('nome'),
    ])
    setServicos(s || [])
    setPacotes(p || [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // --- Serviços ---
  function abrirNovoServico() {
    setEditServico(null); setSnome(''); setSduracao(30); setSpreco(0); setScustos([])
    setModalServico(true)
  }

  function abrirEditarServico(s: Servico) {
    setEditServico(s)
    setSnome(s.nome)
    setSduracao(s.duracao_minutos ?? 30)
    setSpreco(s.preco ?? 0)
    // Se houver custos detalhados, usa-os; senão inicializa com o custo geral salvo
    const custos = s.custos_detalhados?.length > 0
      ? s.custos_detalhados
      : s.custo_geral > 0
        ? [{ descricao: 'Custo do serviço', fornecedor: '', valor: s.custo_geral }]
        : []
    setScustos(custos)
    setModalServico(true)
  }

  function adicionarCusto() { setScustos([...scustos, { descricao: '', fornecedor: '', valor: 0 }]) }
  function removerCusto(i: number) { setScustos(scustos.filter((_, idx) => idx !== i)) }
  function setCusto(i: number, campo: keyof ItemCusto, val: string | number) {
    setScustos(scustos.map((c, idx) => idx === i ? { ...c, [campo]: val } : c))
  }
  const custoGeral = scustos.reduce((s, c) => s + c.valor, 0)

  async function salvarServico() {
    if (!snome.trim()) { toast.error('Informe o nome do serviço.'); return }
    setSalvando(true)
    const payload = { nome: snome, custo_geral: custoGeral, custos_detalhados: scustos, duracao_minutos: sduracao, preco: sPreco }
    if (editServico) {
      await supabase.from('servicos').update(payload).eq('id', editServico.id)
    } else {
      await supabase.from('servicos').insert({ id: gerarId(), ...payload })
    }
    toast.success('Serviço salvo!')
    setModalServico(false); setSalvando(false); carregar()
  }

  async function excluirServico() {
    if (!excluirServId) return
    await supabase.from('servicos').delete().eq('id', excluirServId)
    setExcluirServId(null); toast.success('Serviço excluído.'); carregar()
  }

  // --- Pacotes ---
  function abrirNovoPacote() {
    setEditPacote(null); setPnome(''); setPSessoes(1); setPitens([]); setPpreco(0); setPobs(''); setPServicoId('')
    setModalPacote(true)
  }
  function abrirEditarPacote(p: Pacote) {
    setEditPacote(p); setPnome(p.nome); setPSessoes(p.num_sessoes)
    setPitens(p.itens || []); setPpreco(p.preco_total); setPobs(p.observacao || '')
    setPServicoId(p.servico_id || '')
    setModalPacote(true)
  }
  function adicionarItem() { setPitens([...pitens, { descricao: '', quantidade: 1, valor_unit: 0 }]) }
  function removerItem(i: number) { setPitens(pitens.filter((_, idx) => idx !== i)) }
  function setItem(i: number, campo: keyof ItemPacote, val: string | number) {
    setPitens(pitens.map((it, idx) => idx === i ? { ...it, [campo]: val } : it))
  }
  const totalItens = pitens.reduce((s, it) => s + it.quantidade * it.valor_unit, 0)

  async function salvarPacote() {
    if (!pnome.trim()) { toast.error('Informe o nome do pacote.'); return }
    setSalvando(true)
    const payload = {
      nome: pnome, num_sessoes: pSessoes, itens: pitens,
      preco_total: pPreco, observacao: pObs,
      servico_id: pServicoId || null,
    }
    if (editPacote) {
      await supabase.from('pacotes').update(payload).eq('id', editPacote.id)
    } else {
      await supabase.from('pacotes').insert({ id: gerarId(), ...payload })
    }
    toast.success('Pacote salvo!')
    setModalPacote(false); setSalvando(false); carregar()
  }

  async function excluirPacote() {
    if (!excluirPacId) return
    await supabase.from('pacotes').delete().eq('id', excluirPacId)
    setExcluirPacId(null); toast.success('Pacote excluído.'); carregar()
  }

  return (
    <div className="space-y-4">
      <PageHeader titulo="Catálogo" subtitulo="Serviços e pacotes" />

      {/* Serviços */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setAbrirServicos(!abrirServicos)}>
          <CardTitle className="text-sm flex items-center gap-2">
            {abrirServicos ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Serviços <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">{servicos.length}</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); abrirNovoServico() }}>
            <Plus size={12} className="mr-1" />Novo
          </Button>
        </CardHeader>
        {abrirServicos && (
          <CardContent>
            {servicos.length === 0 ? <EstadoVazio mensagem="Nenhum serviço cadastrado." /> : (
              <div className="divide-y">
                {servicos.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{s.nome}</p>
                      <p className="text-xs text-gray-400">
                        Custo: {formatarMoeda(s.custo_geral)}
                        {s.preco ? ` · Preço: ${formatarMoeda(s.preco)}` : ''}
                        {s.duracao_minutos ? ` · ${s.duracao_minutos} min` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => abrirEditarServico(s)} className="rounded p-1 text-gray-400 hover:text-purple-600"><Edit2 size={14} /></button>
                      <button onClick={() => setExcluirServId(s.id)} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Pacotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setAbrirPacotes(!abrirPacotes)}>
          <CardTitle className="text-sm flex items-center gap-2">
            {abrirPacotes ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Pacotes <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">{pacotes.length}</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); abrirNovoPacote() }}>
            <Plus size={12} className="mr-1" />Novo
          </Button>
        </CardHeader>
        {abrirPacotes && (
          <CardContent>
            {pacotes.length === 0 ? <EstadoVazio mensagem="Nenhum pacote cadastrado." /> : (
              <div className="divide-y">
                {pacotes.map(p => (
                  <div key={p.id} className="flex items-start justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">{p.nome}</p>
                      <p className="text-xs text-gray-400">{p.num_sessoes} sessões · {formatarMoeda(p.preco_total)}</p>
                      {p.servico_id && (
                        <p className="text-xs text-purple-600">
                          Serviço: {servicos.find(s => s.id === p.servico_id)?.nome || '—'}
                        </p>
                      )}
                      <div className="mt-0.5 space-y-0.5">
                        {(p.itens || []).map((it, i) => (
                          <p key={i} className="text-xs text-gray-500">· {it.descricao} ({it.quantidade}x {formatarMoeda(it.valor_unit)})</p>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => abrirEditarPacote(p)} className="rounded p-1 text-gray-400 hover:text-purple-600"><Edit2 size={14} /></button>
                      <button onClick={() => setExcluirPacId(p.id)} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modal serviço */}
      <Dialog open={modalServico} onOpenChange={v => !v && setModalServico(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader><DialogTitle>{editServico ? 'Editar' : 'Novo'} serviço</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={snome} onChange={e => setSnome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Duração (minutos)</Label>
              <Input
                type="number"
                min={1}
                value={sduracao}
                onChange={e => setSduracao(+e.target.value)}
                onFocus={e => e.target.select()}
                placeholder="Ex: 45"
              />
            </div>
            <div className="space-y-1">
              <Label>Preço de venda</Label>
              <CurrencyInput value={sPreco} onChange={setSpreco} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custos detalhados</Label>
                <Button size="sm" variant="outline" onClick={adicionarCusto}><Plus size={12} className="mr-1" />Adicionar</Button>
              </div>
              {scustos.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_80px_24px] gap-1 items-center">
                  <Input className="h-7 text-xs" placeholder="Descrição" value={c.descricao} onChange={e => setCusto(i, 'descricao', e.target.value)} />
                  <Input className="h-7 text-xs" placeholder="Fornecedor" value={c.fornecedor} onChange={e => setCusto(i, 'fornecedor', e.target.value)} />
                  <CurrencyInput className="h-7 text-xs" value={c.valor} onChange={v => setCusto(i, 'valor', v)} />
                  <button onClick={() => removerCusto(i)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              ))}
              <p className="text-xs text-gray-500">Custo total: <strong>{formatarMoeda(custoGeral)}</strong></p>
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={salvarServico} disabled={salvando}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal pacote */}
      <Dialog open={modalPacote} onOpenChange={v => !v && setModalPacote(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader><DialogTitle>{editPacote ? 'Editar' : 'Novo'} pacote</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={pnome} onChange={e => setPnome(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nº de sessões</Label>
              <Input type="number" min={1} value={pSessoes} onChange={e => setPSessoes(+e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Serviço base (para custo do produto)</Label>
              <Select value={pServicoId} onValueChange={v => setPServicoId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum">
                    {servicos.find(s => s.id === pServicoId)?.nome || 'Nenhum'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} — custo {formatarMoeda(s.custo_geral)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button size="sm" variant="outline" onClick={adicionarItem}><Plus size={12} className="mr-1" />Adicionar</Button>
              </div>
              {pitens.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_40px_80px_24px] gap-1 items-center">
                  <Input className="h-7 text-xs" placeholder="Descrição" value={it.descricao} onChange={e => setItem(i, 'descricao', e.target.value)} />
                  <Input className="h-7 text-xs" type="number" min={1} placeholder="Qtd" value={it.quantidade} onChange={e => setItem(i, 'quantidade', +e.target.value)} />
                  <Input className="h-7 text-xs" type="number" placeholder="R$/unit" value={it.valor_unit} onChange={e => setItem(i, 'valor_unit', +e.target.value)} />
                  <button onClick={() => removerItem(i)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              ))}
              <p className="text-xs text-gray-500">Total itens: <strong>{formatarMoeda(totalItens)}</strong></p>
            </div>
            <div className="space-y-1">
              <Label>Preço de venda</Label>
              <CurrencyInput value={pPreco} onChange={setPpreco} />
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Textarea value={pObs} onChange={e => setPobs(e.target.value)} rows={2} />
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={salvarPacote} disabled={salvando}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal aberto={!!excluirServId} mensagem="Excluir este serviço?" onConfirmar={excluirServico} onCancelar={() => setExcluirServId(null)} />
      <ConfirmModal aberto={!!excluirPacId} mensagem="Excluir este pacote?" onConfirmar={excluirPacote} onCancelar={() => setExcluirPacId(null)} />
    </div>
  )
}
