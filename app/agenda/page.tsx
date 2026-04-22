'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Sessao, Funcionaria, Cliente, Servico, Pacote, ServFuncionaria } from '@/lib/supabase'
import { hoje } from '@/lib/utils'
import { AgendaHeader } from '@/components/agenda/AgendaHeader'
import { MiniCalendario } from '@/components/agenda/MiniCalendario'
import { GradeDia } from '@/components/agenda/GradeDia'
import { GradeSemana } from '@/components/agenda/GradeSemana'
import { GradeMes } from '@/components/agenda/GradeMes'
import { ModalAgendamento } from '@/components/agenda/ModalAgendamento'
import { PainelSessoesPendentes } from '@/components/agenda/PainelSessoesPendentes'
import { MESES_PT, DIAS_SEMANA_EXT } from '@/components/agenda/constants'

type View = 'dia' | 'semana' | 'mes'

function dataISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function adicionarDias(data: string, n: number): string {
  const d = new Date(data + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return dataISO(d)
}

function inicioSemana(data: string): string {
  const d = new Date(data + 'T00:00:00')
  d.setDate(d.getDate() - d.getDay())
  return dataISO(d)
}

function labelData(view: View, dataBase: string): string {
  if (view === 'dia') {
    const d = new Date(dataBase + 'T00:00:00')
    const dataFormatada = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${dataFormatada} — ${DIAS_SEMANA_EXT[d.getDay()]}`
  }
  if (view === 'semana') {
    const ini = inicioSemana(dataBase)
    const fim = adicionarDias(ini, 6)
    const dIni = new Date(ini + 'T00:00:00')
    const dFim = new Date(fim + 'T00:00:00')
    const mesIni = dIni.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    const mesFim = dFim.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    return `${mesIni} – ${mesFim}`
  }
  // mes
  const ano = parseInt(dataBase.substring(0, 4))
  const mes = parseInt(dataBase.substring(5, 7)) - 1
  return `${MESES_PT[mes]} de ${ano}`
}

export default function AgendaPage() {
  const [view, setView] = useState<View>('dia')
  const [dataBase, setDataBase] = useState(hoje())
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [funcionarias, setFuncionarias] = useState<Funcionaria[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [sfuncs, setSfuncs] = useState<ServFuncionaria[]>([])
  const [funcionariasVisiveis, setFuncionariasVisiveis] = useState<Set<string>>(new Set())

  // Estado do modal
  const [modalAberto, setModalAberto] = useState(false)
  const [tipoModalInicial, setTipoModalInicial] = useState<'agendamento' | 'bloqueio' | 'lembrete'>('agendamento')
  const [preData, setPreData] = useState<string | undefined>()
  const [preHora, setPreHora] = useState<string | undefined>()
  const [preFuncId, setPreFuncId] = useState<string | undefined>()
  const [sessaoSelecionada, setSessaoSelecionada] = useState<Sessao | null>(null)

  // Painel de sessões pendentes
  const [painelAberto, setPainelAberto] = useState(false)
  const [sessoesPendentes, setSessoesPendentes] = useState(0)
  const [versaoPainel, setVersaoPainel] = useState(0)

  // Carrega funcionárias e dados auxiliares (uma vez)
  useEffect(() => {
    Promise.all([
      supabase.from('funcionarias').select('*').eq('ativo', true).order('nome'),
      supabase.from('clientes').select('*').eq('ativo', true).order('nome'),
      supabase.from('servicos').select('*').order('nome'),
      supabase.from('pacotes').select('*').order('nome'),
      supabase.from('servicos_funcionaria').select('*'),
    ]).then(([{ data: f }, { data: c }, { data: s }, { data: p }, { data: sf }]) => {
      const funcs = f || []
      setFuncionarias(funcs)
      setClientes(c || [])
      setServicos(s || [])
      setPacotes(p || [])
      setSfuncs(sf || [])
      // Todas visíveis por padrão
      setFuncionariasVisiveis(new Set(funcs.map((func) => func.id)))
    })
  }, [])

  // Carrega sessões do período visível
  const carregarSessoes = useCallback(async () => {
    let de = dataBase
    let ate = dataBase

    if (view === 'semana') {
      de = inicioSemana(dataBase)
      ate = adicionarDias(de, 6)
    } else if (view === 'mes') {
      const ano = parseInt(dataBase.substring(0, 4))
      const mes = parseInt(dataBase.substring(5, 7)) - 1
      de = `${dataBase.substring(0, 7)}-01`
      const ultimoDia = new Date(ano, mes + 1, 0).getDate()
      ate = `${dataBase.substring(0, 7)}-${String(ultimoDia).padStart(2, '0')}`
    }

    const { data } = await supabase
      .from('sessoes')
      .select('*')
      .gte('data', de)
      .lte('data', ate)
      .neq('status', 'cancelada')
      .order('hora', { nullsFirst: false })

    setSessoes(data || [])
  }, [dataBase, view])

  useEffect(() => { carregarSessoes() }, [carregarSessoes])

  // Navega entre períodos
  function navegar(delta: number) {
    if (view === 'dia') setDataBase(adicionarDias(dataBase, delta))
    else if (view === 'semana') setDataBase(adicionarDias(dataBase, delta * 7))
    else {
      const d = new Date(dataBase + 'T00:00:00')
      d.setMonth(d.getMonth() + delta)
      setDataBase(dataISO(d))
    }
  }

  function toggleFuncionaria(id: string) {
    setFuncionariasVisiveis((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Abre modal para criar em slot vazio
  function handleSlotClick(data: string, hora: string, funcId?: string) {
    setSessaoSelecionada(null)
    setPreData(data)
    setPreHora(hora)
    setPreFuncId(funcId)
    setModalAberto(true)
  }

  // Abre modal para editar sessão
  function handleSessaoClick(s: Sessao) {
    setSessaoSelecionada(s)
    setPreData(undefined)
    setPreHora(undefined)
    setPreFuncId(undefined)
    setModalAberto(true)
  }

  // Abre modal pelo botão "+ Criar"
  function handleAbrirModal(tipo?: 'agendamento' | 'bloqueio' | 'lembrete') {
    setSessaoSelecionada(null)
    setTipoModalInicial(tipo || 'agendamento')
    setPreData(dataBase)
    setPreHora(undefined)
    setPreFuncId(undefined)
    setModalAberto(true)
  }

  // Abre o modal para agendar uma sessão pendente vinda do painel
  function handleAgendarPendente(sessao: Sessao) {
    setSessaoSelecionada(sessao)
    setPreData(undefined)
    setPreHora(undefined)
    setPreFuncId(undefined)
    setModalAberto(true)
  }

  // Callback após salvar sessão (recarrega grade e painel)
  function handleSalvo() {
    carregarSessoes()
    setVersaoPainel((v) => v + 1)
  }

  // Navega para dia ao clicar no mês
  function handleDiaClick(data: string) {
    setDataBase(data)
    setView('dia')
  }

  return (
    <div className="-mx-4 -my-6 flex flex-col h-[calc(100dvh-56px)] md:h-screen">
      {/* Cabeçalho da agenda */}
      <AgendaHeader
        view={view}
        labelData={labelData(view, dataBase)}
        onViewChange={setView}
        onNavegar={navegar}
        onHoje={() => setDataBase(hoje())}
        onAbrirModal={handleAbrirModal}
        sessoesPendentes={sessoesPendentes}
        onTogglePainel={() => setPainelAberto((v) => !v)}
      />

      {/* Corpo: mini calendário + grade */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar do calendário — oculta no mobile */}
        <div className="hidden md:flex">
          <MiniCalendario
            dataBase={dataBase}
            onSelectData={(d) => { setDataBase(d); setView('dia') }}
            funcionarias={funcionarias}
            funcionariasVisiveis={funcionariasVisiveis}
            onToggleFuncionaria={toggleFuncionaria}
          />
        </div>

        {/* Grade principal + painel lateral de pendentes */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {view === 'dia' && (
              <GradeDia
                data={dataBase}
                sessoes={sessoes}
                funcionarias={funcionarias}
                funcionariasVisiveis={funcionariasVisiveis}
                onSlotClick={handleSlotClick}
                onSessaoClick={handleSessaoClick}
              />
            )}
            {view === 'semana' && (
              <GradeSemana
                dataBase={dataBase}
                sessoes={sessoes}
                funcionarias={funcionarias}
                onSlotClick={(data, hora) => handleSlotClick(data, hora)}
                onSessaoClick={handleSessaoClick}
              />
            )}
            {view === 'mes' && (
              <GradeMes
                dataBase={dataBase}
                sessoes={sessoes}
                funcionarias={funcionarias}
                onDiaClick={handleDiaClick}
                onSessaoClick={handleSessaoClick}
              />
            )}
          </div>

          {/* Painel de sessões a agendar */}
          <PainelSessoesPendentes
            aberto={painelAberto}
            onFechar={() => setPainelAberto(false)}
            onAgendar={handleAgendarPendente}
            versao={versaoPainel}
            onContarPendentes={(n) => {
              setSessoesPendentes(n)
              // Abre automaticamente se houver pendentes ao carregar
              if (n > 0 && versaoPainel === 0) setPainelAberto(true)
            }}
          />
        </div>
      </div>

      {/* Modal de agendamento / edição */}
      <ModalAgendamento
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); setSessaoSelecionada(null) }}
        onSalvo={handleSalvo}
        tipoInicial={tipoModalInicial}
        preData={preData}
        preHora={preHora}
        preFuncId={preFuncId}
        sessao={sessaoSelecionada}
        funcionarias={funcionarias}
        clientes={clientes}
        servicos={servicos}
        pacotes={pacotes}
        sfuncs={sfuncs}
      />
    </div>
  )
}
