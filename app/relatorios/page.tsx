'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { EstadoVazio } from '@/components/shared/EstadoVazio'
import { supabase, Lancamento, Comissao, Funcionaria } from '@/lib/supabase'
import { formatarMoeda, formatarData, hoje } from '@/lib/utils'
import { Download, Check } from 'lucide-react'

type Periodo = 'hoje' | 'semana' | 'mes' | 'personalizado'

function periodoRange(p: Periodo, ini?: string, fim?: string) {
  const hj = hoje()
  if (p === 'hoje') return { de: hj, ate: hj }
  if (p === 'semana') {
    const d = new Date(); d.setDate(d.getDate() - d.getDay())
    return { de: d.toISOString().split('T')[0], ate: hj }
  }
  if (p === 'mes') return { de: hj.substring(0, 7) + '-01', ate: hj }
  return { de: ini || hj, ate: fim || hj }
}

export default function RelatoriosPage() {
  return (
    <div className="space-y-4">
      <PageHeader titulo="Relatórios" />
      <Tabs defaultValue="financeiro">
        <TabsList>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>
        <TabsContent value="financeiro" className="mt-4"><RelatorioFinanceiro /></TabsContent>
        <TabsContent value="comissoes" className="mt-4"><RelatorioComissoes /></TabsContent>
      </Tabs>
    </div>
  )
}

function RelatorioFinanceiro() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [iniCustom, setIniCustom] = useState(hoje())
  const [fimCustom, setFimCustom] = useState(hoje())
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroConta, setFiltroConta] = useState('')
  const [carregando, setCarregando] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { de, ate } = periodoRange(periodo, iniCustom, fimCustom)
    let q = supabase.from('lancamentos').select('*').gte('data', de).lte('data', ate)
      .or('cancelado.is.null,cancelado.eq.false')
      .order('criado_em', { ascending: false })
    if (filtroTipo) q = q.eq('tipo', filtroTipo)
    if (filtroConta) q = q.eq('conta', filtroConta)
    const { data } = await q
    setLancamentos(data || [])
    setCarregando(false)
  }, [periodo, iniCustom, fimCustom, filtroTipo, filtroConta])

  useEffect(() => { carregar() }, [carregar])

  const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo = entradas - saidas

  function exportarCSV() {
    const { de, ate } = periodoRange(periodo, iniCustom, fimCustom)
    // BOM para Excel reconhecer UTF-8; separador ; padrão BR
    const cabecalho = 'Data;Descrição;Categoria;Conta;Tipo;Valor\n'
    const linhas = lancamentos.map(l =>
      `${formatarData(l.data)};"${l.descricao}";"${l.categoria || ''}";"${l.conta || ''}";"${l.tipo === 'entrada' ? 'Entrada' : 'Saída'}";"${formatarMoeda(l.valor)}"`
    ).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_financeiro_${de}_${ate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Totais por conta e categoria
  const porConta: Record<string, number> = {}
  const porCategoria: Record<string, number> = {}
  lancamentos.forEach(l => {
    if (l.conta) porConta[l.conta] = (porConta[l.conta] || 0) + (l.tipo === 'entrada' ? l.valor : -l.valor)
    if (l.categoria) porCategoria[l.categoria] = (porCategoria[l.categoria] || 0) + (l.tipo === 'entrada' ? l.valor : -l.valor)
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-3">
          <div className="flex rounded-lg border bg-gray-50 p-0.5">
            {(['hoje', 'semana', 'mes', 'personalizado'] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${periodo === p ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}>
                {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Período'}
              </button>
            ))}
          </div>
          {periodo === 'personalizado' && (
            <div className="flex items-center gap-2">
              <Input type="date" value={iniCustom} onChange={e => setIniCustom(e.target.value)} className="h-8 w-36" />
              <span className="text-gray-400 text-xs">até</span>
              <Input type="date" value={fimCustom} onChange={e => setFimCustom(e.target.value)} className="h-8 w-36" />
            </div>
          )}
          <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v ?? "")}>
            <SelectTrigger className="h-8 w-28"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroConta} onValueChange={v => setFiltroConta(v ?? "")}>
            <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Conta" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="cnpj">CNPJ</SelectItem>
              <SelectItem value="pessoal">Pessoal</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={exportarCSV}><Download size={14} className="mr-1" />CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Entradas', valor: entradas, cor: 'text-green-600' },
          { label: 'Saídas', valor: saidas, cor: 'text-red-500' },
          { label: 'Saldo', valor: saldo, cor: saldo >= 0 ? 'text-purple-700' : 'text-red-600' },
        ].map(c => (
          <Card key={c.label}><CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`text-base font-bold ${c.cor}`}>{formatarMoeda(c.valor)}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-xs text-gray-500">Por conta</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(porConta).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1">
                <span className="capitalize">{k === 'cnpj' ? 'CNPJ' : k === 'pessoal' ? 'Pessoal' : 'Dinheiro'}</span>
                <span className={v >= 0 ? 'text-green-600' : 'text-red-500'}>{formatarMoeda(v)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs text-gray-500">Por categoria</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(porCategoria).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1">
                <span className="truncate max-w-[60%]">{k}</span>
                <span className={v >= 0 ? 'text-green-600' : 'text-red-500'}>{formatarMoeda(v)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex h-24 items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" /></div>
          ) : lancamentos.length === 0 ? <EstadoVazio /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-gray-50 text-gray-400">
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Descrição</th>
                  <th className="px-4 py-2 text-left">Categoria</th>
                  <th className="px-4 py-2 text-left">Conta</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr></thead>
                <tbody className="divide-y">
                  {lancamentos.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{formatarData(l.data)}</td>
                      <td className="px-4 py-2 truncate max-w-[200px]">{l.descricao}</td>
                      <td className="px-4 py-2">{l.categoria || '-'}</td>
                      <td className="px-4 py-2 capitalize">{l.conta || '-'}</td>
                      <td className={`px-4 py-2 text-right font-medium ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                        {l.tipo === 'saida' ? '-' : '+'}{formatarMoeda(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RelatorioComissoes() {
  const [funcionarias, setFuncionarias] = useState<Funcionaria[]>([])
  const [funcId, setFuncId] = useState('')
  const [mes, setMes] = useState(hoje().substring(0, 7))
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    supabase.from('funcionarias').select('*').order('nome').then(({ data }) => setFuncionarias(data || []))
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    // Usa lt com início do próximo mês para filtro correto de timestamptz
    const ini = mes + '-01'
    const [ano, mesNum] = mes.split('-').map(Number)
    const proximoMes = mesNum === 12
      ? `${ano + 1}-01-01`
      : `${ano}-${String(mesNum + 1).padStart(2, '0')}-01`
    let q = supabase.from('comissoes').select('*')
      .neq('status', 'cancelada')
      .gte('criado_em', ini)
      .lt('criado_em', proximoMes)
      .order('criado_em', { ascending: false })
    if (funcId) q = q.eq('funcionaria_id', funcId)
    const { data } = await q
    setComissoes(data || [])
    setCarregando(false)
  }, [funcId, mes])

  useEffect(() => { carregar() }, [carregar])

  const totalBruto = comissoes.reduce((s, c) => s + c.valor_servico, 0)
  const totalCustos = comissoes.reduce((s, c) => s + c.valor_produto, 0)
  const totalLiq = comissoes.reduce((s, c) => s + c.comissao_liquida, 0)
  const totalPago = comissoes.filter(c => c.status === 'pago').reduce((s, c) => s + c.comissao_liquida, 0)
  const totalAPagar = comissoes.filter(c => c.status === 'a_pagar').reduce((s, c) => s + c.comissao_liquida, 0)

  async function marcarPago(c: Comissao) {
    await supabase.from('comissoes').update({ status: 'pago', data_pagamento: hoje() }).eq('id', c.id)
    carregar()
  }

  function exportarCSV() {
    // BOM UTF-8 + separador ; padrão BR
    const cabecalho = 'Data;Funcionária;Cliente;Serviço;Vlr. Bruto;Custos;Vlr. Líquido;%;Comissão;Status\n'
    const linhas = comissoes.map(c =>
      `${formatarData(c.criado_em?.substring(0, 10))};"${c.funcionaria_nome || ''}";"${c.cliente_nome || ''}";"${c.servico || ''}";"${formatarMoeda(c.valor_servico)}";"${formatarMoeda(c.valor_produto)}";"${formatarMoeda(c.base)}";"${c.pct_comissao}%";"${formatarMoeda(c.comissao_liquida)}";"${c.status === 'pago' ? 'Pago' : 'A pagar'}"`
    ).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio_comissoes_${mes}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-3">
          <Select value={funcId} onValueChange={v => setFuncId(v ?? "")}>
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Todas as funcionárias">
                {funcId ? funcionarias.find(f => f.id === funcId)?.nome : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {funcionarias.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="month" value={mes} onChange={e => setMes(e.target.value)} className="h-8 w-36" />
          <Button size="sm" variant="outline" onClick={exportarCSV}><Download size={14} className="mr-1" />CSV</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Atendimentos', valor: comissoes.length, isMoeda: false, cor: 'text-gray-800' },
          { label: 'Vlr. Bruto do procedimento', valor: totalBruto, isMoeda: true, cor: 'text-gray-800' },
          { label: 'Comissão a receber', valor: totalLiq, isMoeda: true, cor: 'text-purple-700' },
          { label: 'Pago', valor: totalPago, isMoeda: true, cor: 'text-green-600' },
          { label: 'A pagar', valor: totalAPagar, isMoeda: true, cor: 'text-amber-600' },
        ].map(c => (
          <Card key={c.label}><CardContent className="p-3 text-center">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`text-base font-bold ${c.cor}`}>
              {c.isMoeda ? formatarMoeda(c.valor as number) : c.valor}
            </p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {carregando ? (
            <div className="flex h-24 items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" /></div>
          ) : comissoes.length === 0 ? <EstadoVazio mensagem="Nenhuma comissão no período." /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b bg-gray-50 text-gray-400">
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Funcionária</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Serviço</th>
                  <th className="px-3 py-2 text-right">Vlr. Bruto</th>
                  <th className="px-3 py-2 text-right">Custos</th>
                  <th className="px-3 py-2 text-right">Vlr. Líq.</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2 text-right">Comissão a receber</th>
                  <th className="px-3 py-2 text-center">Status</th>
                  <th />
                </tr></thead>
                <tbody className="divide-y">
                  {comissoes.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{formatarData(c.criado_em?.substring(0, 10))}</td>
                      <td className="px-3 py-2">{c.funcionaria_nome || '-'}</td>
                      <td className="px-3 py-2 truncate max-w-[100px]">{c.cliente_nome || '-'}</td>
                      <td className="px-3 py-2 truncate max-w-[120px]">{c.servico || '-'}</td>
                      <td className="px-3 py-2 text-right">{formatarMoeda(c.valor_servico)}</td>
                      <td className="px-3 py-2 text-right text-red-500">{formatarMoeda(c.valor_produto)}</td>
                      <td className="px-3 py-2 text-right">{formatarMoeda(c.base)}</td>
                      <td className="px-3 py-2 text-right">{c.pct_comissao}%</td>
                      <td className="px-3 py-2 text-right font-medium text-purple-700">{formatarMoeda(c.comissao_liquida)}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant={c.status === 'pago' ? 'default' : 'secondary'}
                          className={`text-[10px] ${c.status === 'pago' ? 'bg-green-600' : 'bg-amber-100 text-amber-700'}`}
                        >
                          {c.status === 'pago' ? 'Pago' : 'A pagar'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {c.status === 'a_pagar' && (
                          <button onClick={() => marcarPago(c)}
                            className="flex items-center gap-0.5 text-green-600 hover:underline text-[10px] whitespace-nowrap">
                            <Check size={10} />✓ Pago
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-xs">Total</td>
                    <td className="px-3 py-2 text-right text-xs">{formatarMoeda(totalBruto)}</td>
                    <td className="px-3 py-2 text-right text-xs text-red-500">{formatarMoeda(totalCustos)}</td>
                    <td className="px-3 py-2 text-right text-xs" />
                    <td className="px-3 py-2 text-right text-xs" />
                    <td className="px-3 py-2 text-right text-xs text-purple-700">{formatarMoeda(totalLiq)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
