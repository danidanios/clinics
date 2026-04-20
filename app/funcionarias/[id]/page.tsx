'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PageHeader } from '@/components/layout/PageHeader'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { supabase, Funcionaria, Servico, Pacote, ServFuncionaria, Comissao, Sessao } from '@/lib/supabase'
import { formatarMoeda, formatarData, gerarId, hoje } from '@/lib/utils'
import { toast } from 'sonner'
import { ArrowLeft, Check } from 'lucide-react'

export default function PerfilFuncionariaPage() {
  const { id } = useParams<{ id: string }>()
  const [func, setFunc] = useState<Funcionaria | null>(null)
  const [funcIndice, setFuncIndice] = useState(0)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [sfuncs, setSfuncs] = useState<ServFuncionaria[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  // Lembretes onde esta funcionária é responsável
  const [lembretes, setLembretes] = useState<Sessao[]>([])
  const [mesFiltro, setMesFiltro] = useState(hoje().substring(0, 7))
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const [{ data: f }, { data: s }, { data: p }, { data: sf }, { data: sess }, { data: funcs }, { data: lembs }] = await Promise.all([
      supabase.from('funcionarias').select('*').eq('id', id).single(),
      supabase.from('servicos').select('*').order('nome'),
      supabase.from('pacotes').select('*').order('nome'),
      supabase.from('servicos_funcionaria').select('*').eq('funcionaria_id', id),
      supabase.from('sessoes').select('*').eq('funcionaria_id', id).neq('status', 'cancelada'),
      // Carrega todas ordenadas por criado_em para calcular o índice de cor
      supabase.from('funcionarias').select('id,criado_em').order('criado_em'),
      supabase.from('sessoes').select('*').eq('responsavel_id', id).eq('status', 'lembrete'),
    ])
    setFunc(f)
    setServicos(s || [])
    setPacotes(p || [])
    setSfuncs(sf || [])
    setSessoes(sess || [])
    setLembretes(lembs || [])
    // Calcula índice de cor da funcionária na lista ordenada
    const idx = (funcs || []).findIndex((f2) => f2.id === id)
    setFuncIndice(idx >= 0 ? idx : 0)
  }, [id])

  const carregarComissoes = useCallback(async () => {
    const ini = mesFiltro + '-01'
    const [ano, mes] = mesFiltro.split('-').map(Number)
    const proximoMes = mes === 12
      ? `${ano + 1}-01-01`
      : `${ano}-${String(mes + 1).padStart(2, '0')}-01`
    const { data } = await supabase.from('comissoes').select('*')
      .eq('funcionaria_id', id)
      .neq('status', 'cancelada')
      .gte('criado_em', ini)
      .lt('criado_em', proximoMes)
      .order('criado_em', { ascending: false })
    setComissoes(data || [])
  }, [id, mesFiltro])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { carregarComissoes() }, [carregarComissoes])

  function getPct(itemId: string, itemTipo: string): number {
    const sf = sfuncs.find(s => s.item_id === itemId && s.item_tipo === itemTipo)
    return sf?.comissao_pct ?? (func?.comissao_pct || 0)
  }

  function setPct(itemId: string, itemTipo: string, pct: number) {
    const existe = sfuncs.find(s => s.item_id === itemId && s.item_tipo === itemTipo)
    if (existe) {
      setSfuncs(sfuncs.map(s => s.item_id === itemId && s.item_tipo === itemTipo ? { ...s, comissao_pct: pct } : s))
    } else {
      setSfuncs([...sfuncs, { id: gerarId(), funcionaria_id: id, item_id: itemId, item_tipo: itemTipo as 'servico' | 'pacote', comissao_pct: pct }])
    }
  }

  async function salvarDados() {
    if (!func) return
    setSalvando(true)
    const updates: Partial<Funcionaria> = { nome: func.nome, tipo: func.tipo }
    if (novaSenha) updates.senha = novaSenha
    await supabase.from('funcionarias').update(updates).eq('id', id)
    toast.success('Dados atualizados!')
    setNovaSenha('')
    setSalvando(false)
  }

  async function salvarComissoes() {
    setSalvando(true)
    await supabase.from('servicos_funcionaria').delete().eq('funcionaria_id', id)
    if (sfuncs.length > 0) await supabase.from('servicos_funcionaria').insert(sfuncs)
    toast.success('Comissões salvas!')
    setSalvando(false)
  }

  async function marcarPago(c: Comissao) {
    await supabase.from('comissoes').update({ status: 'pago', data_pagamento: hoje() }).eq('id', c.id)
    toast.success('Comissão marcada como paga.')
    carregarComissoes()
  }

  const diasComSessoes = Array.from(new Set(sessoes.filter(s => s.data?.startsWith(mesFiltro)).map(s => s.data)))
  const diasDoMes = () => {
    const [ano, mes] = mesFiltro.split('-').map(Number)
    const fim = new Date(ano, mes, 0).getDate()
    return Array.from({ length: fim }, (_, i) => `${mesFiltro}-${String(i + 1).padStart(2, '0')}`)
  }

  if (!func) return (
    <div className="flex h-40 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
    </div>
  )

  // Bloco 9: conteúdo diferente por tipo de funcionária
  const ehSecretaria = func.tipo === 'secretaria'

  // Totais de comissão
  const totalBruto = comissoes.reduce((s, c) => s + c.valor_servico, 0)
  const totalCustos = comissoes.reduce((s, c) => s + c.valor_produto, 0)
  const totalLiq = comissoes.reduce((s, c) => s + c.comissao_liquida, 0)
  const totalPago = comissoes.filter(c => c.status === 'pago').reduce((s, c) => s + c.comissao_liquida, 0)
  const totalAPagar = comissoes.filter(c => c.status === 'a_pagar').reduce((s, c) => s + c.comissao_liquida, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={func.nome}
        subtitulo={ehSecretaria ? 'Secretária' : 'Profissional de estética'}
        acoes={<Link href="/funcionarias"><Button variant="outline" size="sm"><ArrowLeft size={14} className="mr-1" />Voltar</Button></Link>}
      />

      {/* Dados básicos */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Dados básicos</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={func.nome} onChange={e => setFunc({ ...func, nome: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={func.tipo || 'profissional'} onValueChange={v => setFunc({ ...func, tipo: v as 'profissional' | 'secretaria' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="profissional">Profissional de estética</SelectItem>
                <SelectItem value="secretaria">Secretária</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Nova senha (deixe em branco para não alterar)</Label>
            <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="flex items-end sm:col-span-2">
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={salvarDados} disabled={salvando}>Salvar dados</Button>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 9: secretária vê acesso e lembretes, profissional vê comissões e calendário */}
      {ehSecretaria ? (
        <>
          {/* Seção acesso */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Acesso</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Esta funcionária tem acesso como <strong>Secretária</strong> — pode visualizar a agenda, criar agendamentos e gerenciar sessões pendentes, mas não recebe comissão por sessão.
              </p>
            </CardContent>
          </Card>

          {/* Lembretes atribuídos */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Lembretes atribuídos</CardTitle></CardHeader>
            <CardContent>
              {lembretes.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum lembrete atribuído.</p>
              ) : (
                <div className="divide-y">
                  {lembretes.map(l => (
                    <div key={l.id} className="py-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{l.item_nome}</p>
                        <p className="text-xs text-gray-400">{formatarData(l.data)}{l.hora ? ` · ${l.hora}` : ''}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">Pendente</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Comissões por serviço */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Comissões por serviço</CardTitle>
              <Button size="sm" variant="outline" onClick={salvarComissoes} disabled={salvando}>Salvar</Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {servicos.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-4 py-2">
                    <span className="text-sm text-gray-700 flex-1">{s.nome}</span>
                    <div className="flex items-center gap-1 w-24">
                      <Input
                        type="number" min={0} max={100} className="h-7 text-xs"
                        value={getPct(s.id, 'servico') === 0 ? '' : getPct(s.id, 'servico')}
                        onChange={e => setPct(s.id, 'servico', e.target.value === '' ? 0 : +e.target.value)}
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comissões por pacote */}
          {pacotes.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Comissões por pacote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {pacotes.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-4 py-2">
                      <span className="text-sm text-gray-700 flex-1">{p.nome}</span>
                      <div className="flex items-center gap-1 w-24">
                        <Input
                          type="number" min={0} max={100} className="h-7 text-xs"
                          value={getPct(p.id, 'pacote') === 0 ? '' : getPct(p.id, 'pacote')}
                          onChange={e => setPct(p.id, 'pacote', e.target.value === '' ? 0 : +e.target.value)}
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Calendário */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Calendário — {mesFiltro}</CardTitle>
              <Input type="month" value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} className="w-36 h-8" />
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-gray-500">{diasComSessoes.length} sessão(ões) agendadas neste mês</p>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="text-gray-400">{d}</span>)}
                {Array.from({ length: new Date(mesFiltro + '-01T00:00:00').getDay() }, (_, i) => <div key={`v${i}`} />)}
                {diasDoMes().map(d => {
                  const temSessao = diasComSessoes.includes(d)
                  return (
                    <button
                      key={d}
                      onClick={() => temSessao && setDiaSelecionado(d)}
                      className={`rounded p-1 transition-colors ${temSessao ? 'bg-purple-100 hover:bg-purple-200 cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className={`text-xs ${temSessao ? 'text-purple-700 font-bold' : 'text-gray-600'}`}>
                        {d.split('-')[2]}
                      </span>
                      {temSessao && <div className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-purple-600" />}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Relatório de comissões — Bloco 10: labels renomeadas */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Relatório de comissões</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: 'Valor bruto do procedimento', valor: totalBruto, cor: 'text-gray-800' },
                  { label: 'Custos do serviço', valor: totalCustos, cor: 'text-red-500' },
                  { label: 'Comissão a receber', valor: totalLiq, cor: 'text-purple-700' },
                  { label: 'Pago', valor: totalPago, cor: 'text-green-600' },
                  { label: 'A pagar', valor: totalAPagar, cor: 'text-amber-600' },
                ].map(c => (
                  <div key={c.label} className="rounded-lg border p-2 text-center">
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className={`text-sm font-bold ${c.cor}`}>{formatarMoeda(c.valor)}</p>
                  </div>
                ))}
              </div>
              {comissoes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Nenhuma comissão no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-gray-400">
                        <th className="py-1 text-left">Data</th>
                        <th className="py-1 text-left">Cliente</th>
                        <th className="py-1 text-left">Serviço</th>
                        <th className="py-1 text-right">Vlr. Bruto</th>
                        <th className="py-1 text-right">Custos</th>
                        <th className="py-1 text-right">Vlr. Líq.</th>
                        <th className="py-1 text-right">%</th>
                        <th className="py-1 text-right">Comissão a receber</th>
                        <th className="py-1 text-center">Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {comissoes.map(c => (
                        <tr key={c.id}>
                          <td className="py-1 whitespace-nowrap">{formatarData(c.criado_em?.substring(0, 10))}</td>
                          <td className="py-1 truncate max-w-[100px]">{c.cliente_nome || '-'}</td>
                          <td className="py-1 truncate max-w-[120px]">{c.servico || '-'}</td>
                          <td className="py-1 text-right">{formatarMoeda(c.valor_servico)}</td>
                          <td className="py-1 text-right text-red-500">{formatarMoeda(c.valor_produto)}</td>
                          <td className="py-1 text-right">{formatarMoeda(c.base)}</td>
                          <td className="py-1 text-right">{c.pct_comissao}%</td>
                          <td className="py-1 text-right font-medium text-purple-700">{formatarMoeda(c.comissao_liquida)}</td>
                          <td className="py-1 text-center">
                            <Badge
                              variant={c.status === 'pago' ? 'default' : 'secondary'}
                              className={`text-[10px] ${c.status === 'pago' ? 'bg-green-600' : 'bg-amber-100 text-amber-700'}`}
                            >
                              {c.status === 'pago' ? 'Pago' : 'A pagar'}
                            </Badge>
                          </td>
                          <td className="py-1 text-right">
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
                        <td colSpan={3} className="py-1 text-xs">Total</td>
                        <td className="py-1 text-right text-xs">{formatarMoeda(totalBruto)}</td>
                        <td className="py-1 text-right text-xs text-red-500">{formatarMoeda(totalCustos)}</td>
                        <td className="py-1 text-right text-xs" />
                        <td className="py-1 text-right text-xs" />
                        <td className="py-1 text-right text-xs text-purple-700">{formatarMoeda(totalLiq)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Sheet com procedimentos do dia clicado */}
      <Sheet open={!!diaSelecionado} onOpenChange={(v) => !v && setDiaSelecionado(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {diaSelecionado
                ? new Date(diaSelecionado + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })
                : ''}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6 space-y-3">
            {sessoes.filter((s) => s.data === diaSelecionado)
              .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
              .map((s) => (
                <div key={s.id} className="rounded-lg border bg-white p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">{s.hora || 'Sem hora'}</span>
                    <Badge variant={s.status === 'realizada' ? 'default' : 'secondary'} className="text-[10px]">
                      {s.status === 'realizada' ? 'Realizada' : s.status === 'cancelada' ? 'Cancelada'
                        : s.status === 'confirmada' ? 'Confirmada' : 'Agendada'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-gray-800">
                    {s.procedimento_numero ? `#${s.procedimento_numero} — ` : ''}{s.cliente_nome || '—'}
                  </p>
                  <p className="text-xs text-gray-500">{s.item_nome || '—'}</p>
                  <div className="flex items-center justify-between pt-1 border-t text-xs text-gray-500">
                    <span>Valor: <span className="font-medium text-gray-800">{formatarMoeda(s.valor_servico)}</span></span>
                    {s.status === 'realizada' && (
                      <span>Comissão: <span className="font-medium text-purple-700">{s.comissao_pct}%</span></span>
                    )}
                  </div>
                </div>
              ))}
            {sessoes.filter((s) => s.data === diaSelecionado).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum procedimento neste dia.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
