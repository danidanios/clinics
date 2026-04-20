'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { EstadoVazio } from '@/components/shared/EstadoVazio'
import { supabase, Lancamento, Funcionaria } from '@/lib/supabase'
import { formatarMoeda, formatarData, hoje, gerarId } from '@/lib/utils'
import { toast } from 'sonner'
import { Trash2, Download } from 'lucide-react'

type Tipo = 'entrada' | 'saida'
type Conta = 'cnpj' | 'pessoal' | 'dinheiro'
type Periodo = 'hoje' | 'semana' | 'mes' | 'personalizado'

const CATS_ENTRADA = ['Serviços prestados', 'Outros recebimentos']
const CATS_SAIDA = ['Pró-labore', 'Despesas da clínica', 'Contas fixas', 'Fornecedores']

function periodoRange(p: Periodo, ini?: string, fim?: string): { de: string; ate: string } {
  const hj = hoje()
  if (p === 'hoje') return { de: hj, ate: hj }
  if (p === 'semana') {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`
    return { de: iso(d), ate: hj }
  }
  if (p === 'mes') return { de: hj.substring(0, 7) + '-01', ate: hj }
  return { de: ini || hj, ate: fim || hj }
}

export default function FinanceiroPage() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [funcionarias, setFuncionarias] = useState<Funcionaria[]>([])
  const [carregando, setCarregando] = useState(false)

  // Filtros
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [iniCustom, setIniCustom] = useState(hoje())
  const [fimCustom, setFimCustom] = useState(hoje())
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroConta, setFiltroConta] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')

  // Formulário novo lançamento
  const [tipo, setTipo] = useState<Tipo>('entrada')
  const [data, setData] = useState(hoje())
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [conta, setConta] = useState<Conta>('cnpj')
  const [valor, setValor] = useState(0)
  const [funcId, setFuncId] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Exclusão
  const [excluirId, setExcluirId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { de, ate } = periodoRange(periodo, iniCustom, fimCustom)
    let q = supabase.from('lancamentos').select('*').gte('data', de).lte('data', ate)
      .or('cancelado.is.null,cancelado.eq.false')
      .order('criado_em', { ascending: false })
    if (filtroTipo) q = q.eq('tipo', filtroTipo)
    if (filtroConta) q = q.eq('conta', filtroConta)
    if (filtroCategoria) q = q.eq('categoria', filtroCategoria)
    const { data: rows } = await q
    setLancamentos(rows || [])
    setCarregando(false)
  }, [periodo, iniCustom, fimCustom, filtroTipo, filtroConta, filtroCategoria])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    supabase.from('funcionarias').select('*').eq('ativo', true).order('nome').then(({ data }) => setFuncionarias(data || []))
  }, [])

  async function salvar() {
    if (!descricao.trim()) { toast.error('Informe a descrição.'); return }
    if (valor <= 0) { toast.error('Informe um valor válido.'); return }
    setSalvando(true)
    const func = funcionarias.find(f => f.id === funcId)
    const { error } = await supabase.from('lancamentos').insert({
      id: gerarId(), data, tipo, descricao: descricao.trim(), categoria, conta, valor,
      funcionaria_id: funcId || null, funcionaria_nome: func?.nome || null, observacao: observacao || null,
    })
    if (error) { toast.error('Erro ao salvar lançamento.'); setSalvando(false); return }
    toast.success('Lançamento salvo!')
    setDescricao(''); setCategoria(''); setValor(0); setObservacao(''); setFuncId('')
    setSalvando(false)
    carregar()
  }

  async function excluir() {
    if (!excluirId) return
    await supabase.from('lancamentos').delete().eq('id', excluirId)
    setExcluirId(null)
    toast.success('Lançamento excluído.')
    carregar()
  }

  function exportarCSV() {
    const cabecalho = 'Data,Descrição,Categoria,Conta,Tipo,Valor\n'
    const linhas = lancamentos.map(l =>
      `${formatarData(l.data)},"${l.descricao}","${l.categoria || ''}","${l.conta || ''}","${l.tipo}","${l.valor}"`
    ).join('\n')
    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'financeiro.csv'; a.click()
  }

  const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo = entradas - saidas

  const categorias = tipo === 'entrada' ? CATS_ENTRADA : CATS_SAIDA

  return (
    <div className="space-y-6">
      <PageHeader titulo="Financeiro" subtitulo="Controle de caixa" />

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Entradas', valor: entradas, cor: 'text-green-600' },
          { label: 'Saídas', valor: saidas, cor: 'text-red-500' },
          { label: 'Saldo', valor: saldo, cor: saldo >= 0 ? 'text-purple-700' : 'text-red-600' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-base font-bold ${c.cor}`}>{formatarMoeda(c.valor)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Formulário */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Novo lançamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex rounded-lg border bg-gray-50 p-1">
              {(['entrada', 'saida'] as Tipo[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTipo(t); setCategoria('') }}
                  className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                    tipo === t
                      ? t === 'entrada' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                      : 'text-gray-500'
                  }`}
                >{t === 'entrada' ? 'Entrada' : 'Saída'}</button>
              ))}
            </div>

            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Atendimento Botox" />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={v => setCategoria(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Conta</Label>
              <Select value={conta} onValueChange={v => setConta(v as Conta)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro físico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Valor *</Label>
              <CurrencyInput value={valor} onChange={setValor} />
            </div>
            <div className="space-y-1">
              <Label>Funcionária (opcional)</Label>
              <Select value={funcId} onValueChange={v => setFuncId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {funcionarias.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Observação</Label>
              <Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional" />
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar lançamento'}
            </Button>
          </CardContent>
        </Card>

        {/* Lista */}
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap gap-2 p-3">
              <Tabs value={periodo} onValueChange={v => setPeriodo(v as Periodo)}>
                <TabsList>
                  <TabsTrigger value="hoje">Hoje</TabsTrigger>
                  <TabsTrigger value="semana">Semana</TabsTrigger>
                  <TabsTrigger value="mes">Mês</TabsTrigger>
                  <TabsTrigger value="personalizado">Período</TabsTrigger>
                </TabsList>
              </Tabs>
              {periodo === 'personalizado' && (
                <div className="flex items-center gap-2">
                  <Input type="date" value={iniCustom} onChange={e => setIniCustom(e.target.value)} className="h-8 w-36" />
                  <span className="text-gray-400">até</span>
                  <Input type="date" value={fimCustom} onChange={e => setFimCustom(e.target.value)} className="h-8 w-36" />
                </div>
              )}
              <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v ?? "")}>
                <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroConta} onValueChange={v => setFiltroConta(v ?? "")}>
                <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Conta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={exportarCSV}>
                <Download size={14} className="mr-1" />CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {carregando ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                </div>
              ) : lancamentos.length === 0 ? (
                <EstadoVazio mensagem="Nenhum lançamento encontrado." />
              ) : (
                <div className="divide-y">
                  {lancamentos.map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{l.descricao}</p>
                        <p className="text-xs text-gray-400">
                          {formatarData(l.data)} · {l.categoria || '-'} · {l.conta || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={l.tipo === 'entrada' ? 'default' : 'destructive'} className="text-xs">
                          {l.tipo === 'entrada' ? `+${formatarMoeda(l.valor)}` : `-${formatarMoeda(l.valor)}`}
                        </Badge>
                        <button
                          onClick={() => setExcluirId(l.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmModal
        aberto={!!excluirId}
        mensagem="Deseja excluir este lançamento? Esta ação não pode ser desfeita."
        onConfirmar={excluir}
        onCancelar={() => setExcluirId(null)}
      />
    </div>
  )
}
