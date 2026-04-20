'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { supabase, Lancamento, Sessao, Funcionaria, Comissao } from '@/lib/supabase'
import { formatarMoeda, hoje } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

type KPI = { label: string; valor: number; cor: string; icone: React.ReactNode }
type FuncSessoes = { funcionaria: Funcionaria; sessoes: number }

export default function DashboardPage() {
  const router = useRouter()
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [funcionarias, setFuncionarias] = useState<Funcionaria[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const hj = hoje()
    const mesInicio = hj.substring(0, 7) + '-01'

    const [{ data: lancs }, { data: comis }, { data: sess }, { data: funcs }] = await Promise.all([
      supabase.from('lancamentos').select('*').eq('data', hj).or('cancelado.is.null,cancelado.eq.false'),
      supabase.from('comissoes').select('*').eq('status', 'a_pagar').gte('criado_em', mesInicio),
      supabase.from('sessoes').select('*').eq('data', hj).neq('status', 'cancelada'),
      supabase.from('funcionarias').select('*').eq('ativo', true),
    ])

    setLancamentos(lancs || [])
    setComissoes(comis || [])
    setSessoes(sess || [])
    setFuncionarias(funcs || [])
    setCarregando(false)
  }, [])

  // Carrega ao montar e sempre que a aba volta ao foco
  useEffect(() => {
    carregar()

    function onFocus() { carregar() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') carregar()
    })
    return () => window.removeEventListener('focus', onFocus)
  }, [carregar])

  function atualizar() {
    router.refresh()
    carregar()
  }

  const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo = entradas - saidas
  const comissoesMes = comissoes.reduce((s, c) => s + c.comissao_liquida, 0)

  const kpis: KPI[] = [
    { label: 'Entradas hoje', valor: entradas, cor: 'bg-green-500', icone: <TrendingUp size={20} /> },
    { label: 'Saídas hoje', valor: saidas, cor: 'bg-red-500', icone: <TrendingDown size={20} /> },
    { label: 'Saldo hoje', valor: saldo, cor: 'bg-purple-600', icone: <DollarSign size={20} /> },
    { label: 'Comissões a pagar', valor: comissoesMes, cor: 'bg-amber-500', icone: <AlertCircle size={20} /> },
  ]

  const funcSessoes: FuncSessoes[] = funcionarias.map(f => ({
    funcionaria: f,
    sessoes: sessoes.filter(s => s.funcionaria_id === f.id).length,
  }))

  const alertas: string[] = []
  if (saldo < 0) alertas.push('Saldo negativo hoje!')
  if (lancamentos.length === 0) alertas.push('Nenhum lançamento registrado hoje.')
  const comissOld = comissoes.filter(c => {
    const dias = (Date.now() - new Date(c.criado_em || '').getTime()) / 86400000
    return dias > 30
  })
  if (comissOld.length > 0) alertas.push(`${comissOld.length} comissão(ões) sem pagar há mais de 30 dias.`)

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Dashboard"
        subtitulo={`Hoje, ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        acoes={
          <Button size="sm" variant="outline" onClick={atualizar} disabled={carregando}>
            <RefreshCw size={14} className={`mr-1 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(k => (
          <Card key={k.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-white ${k.cor}`}>
                {k.icone}
              </div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="mt-0.5 text-lg font-bold text-gray-900">{formatarMoeda(k.valor)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grade 2×2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* Lançamentos do dia */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold">Financeiro — hoje</CardTitle>
            <Link href="/financeiro" className="text-xs text-purple-600 hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent>
            {lancamentos.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum lançamento hoje.</p>
            ) : (
              <ul className="space-y-2">
                {lancamentos.slice(0, 5).map(l => (
                  <li key={l.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 truncate max-w-[60%]">{l.descricao}</span>
                    <span className={l.tipo === 'entrada' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                      {l.tipo === 'saida' ? '-' : '+'}{formatarMoeda(l.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Procedimentos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Procedimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Sessões hoje</span>
              <span className="font-semibold">{sessoes.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Realizadas</span>
              <span className="font-semibold">{sessoes.filter(s => s.status === 'realizada').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Comissões a pagar (mês)</span>
              <span className="font-semibold text-amber-600">{formatarMoeda(comissoesMes)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Funcionárias */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Funcionárias ativas</CardTitle>
          </CardHeader>
          <CardContent>
            {funcSessoes.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma funcionária ativa.</p>
            ) : (
              <ul className="space-y-2">
                {funcSessoes.map(({ funcionaria: f, sessoes: qtd }) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <AvatarInitiais nome={f.nome} tamanho={28} />
                    <span className="flex-1 text-xs text-gray-700">{f.nome}</span>
                    <span className="text-xs text-gray-400">{qtd} sessão(ões)</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {alertas.length === 0 ? (
              <p className="text-xs text-green-600">Tudo certo! Sem alertas no momento.</p>
            ) : (
              <ul className="space-y-1.5">
                {alertas.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
