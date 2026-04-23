'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { supabase, Sessao, Funcionaria, Cliente, Servico, Pacote, ServFuncionaria } from '@/lib/supabase'
import { gerarId, formatarMoeda, formatarNumero, hoje } from '@/lib/utils'
import { Trash2 } from 'lucide-react'
import { calcularComissao } from '@/lib/comissao'
import { toast } from 'sonner'
import { SLOTS_MODAL, adicionarMinutos, corFuncionaria, proximoSlot } from './constants'
import { cn } from '@/lib/utils'

type TipoModal = 'agendamento' | 'bloqueio' | 'lembrete'

type Props = {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
  tipoInicial?: TipoModal
  preData?: string
  preHora?: string
  preFuncId?: string
  sessao?: Sessao | null
  funcionarias: Funcionaria[]
  clientes: Cliente[]
  servicos: Servico[]
  pacotes: Pacote[]
  sfuncs: ServFuncionaria[]
}

export function ModalAgendamento({
  aberto,
  onFechar,
  onSalvo,
  tipoInicial,
  preData,
  preHora,
  preFuncId,
  sessao,
  funcionarias,
  clientes,
  servicos,
  pacotes,
  sfuncs,
}: Props) {
  const modoEdicao = !!sessao

  const [tipo, setTipo] = useState<TipoModal>('agendamento')

  // Campos de agendamento
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [tipoItem, setTipoItem] = useState<'servico' | 'pacote'>('servico')
  const [itemId, setItemId] = useState('')
  const [funcId, setFuncId] = useState('')
  const [status, setStatus] = useState('agendada')
  const [data, setData] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFim, setHoraFim] = useState('')
  const [valor, setValor] = useState(0)
  const [descontoAtivo, setDescontoAtivo] = useState(false)
  const [descontoTipo, setDescontoTipo] = useState<'pct' | 'valor'>('pct')
  const [descontoValor, setDescontoValor] = useState(0)
  const [formaPag, setFormaPag] = useState('')
  const [parcelas, setParcelas] = useState(1)
  const [statusPag, setStatusPag] = useState('pendente')
  const [comissaoPct, setComissaoPct] = useState(0)
  const [comissaoLock, setComissaoLock] = useState(true)
  const [custoProd, setCustoProd] = useState(0)
  const [custoLock, setCustoLock] = useState(true)
  const [obs, setObs] = useState('')
  const [realizado, setRealizado] = useState(false)
  const [numProc, setNumProc] = useState('')
  const [duracaoSessao, setDuracaoSessao] = useState(30)

  // Campos de bloqueio
  const [bloqFuncId, setBloqFuncId] = useState('')
  const [bloqData, setBloqData] = useState('')
  const [bloqHoraInicio, setBloqHoraInicio] = useState('')
  const [bloqHoraFim, setBloqHoraFim] = useState('')
  const [bloqMotivo, setBloqMotivo] = useState('')

  // Campos de lembrete
  const [lembTitulo, setLembTitulo] = useState('')
  const [lembData, setLembData] = useState('')
  const [lembHora, setLembHora] = useState('')
  const [lembObs, setLembObs] = useState('')
  const [lembResponsavelId, setLembResponsavelId] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [statusPagOriginal, setStatusPagOriginal] = useState('pendente')
  const [valorProcedimento, setValorProcedimento] = useState(0)

  const clientesFiltrados = clientes.filter(
    (c) => !buscaCliente || c.nome.toLowerCase().includes(buscaCliente.toLowerCase()),
  )

  useEffect(() => {
    if (!aberto) return

    if (modoEdicao && sessao) {
      setTipo(
        sessao.status === 'bloqueio' ? 'bloqueio'
          : sessao.status === 'lembrete' ? 'lembrete'
            : 'agendamento',
      )
      setClienteId(sessao.cliente_id || '')
      setBuscaCliente(sessao.cliente_nome || '')
      setFuncId(sessao.funcionaria_id || '')
      setData(sessao.data || '')
      setHoraInicio(sessao.hora || '')
      setHoraFim(sessao.hora_fim || '')
      setValor(sessao.valor_servico)
      setComissaoPct(sessao.comissao_pct)
      setCustoProd(sessao.custo_produto)
      setObs('')
      setRealizado(sessao.status === 'realizada')
      setNumProc(sessao.procedimento_numero || '')
      setLembResponsavelId(sessao.responsavel_id || '')
      setDescontoAtivo(false)
      setDescontoValor(0)
      setDescontoTipo('pct')
      setStatusPag('pendente')
      setStatusPagOriginal('pendente')
      if (sessao.procedimento_id) {
        supabase.from('procedimentos').select('status_pagamento,valor_final')
          .eq('id', sessao.procedimento_id).single()
          .then(({ data: proc }) => {
            if (proc) {
              setStatusPag(proc.status_pagamento)
              setStatusPagOriginal(proc.status_pagamento)
              setValorProcedimento(proc.valor_final || 0)
            }
          })
      }
    } else {
      setTipo(tipoInicial || 'agendamento')
      setClienteId('')
      setBuscaCliente('')
      setFuncId(preFuncId || '')
      setData(preData || '')
      setHoraInicio(preHora || '')
      setHoraFim(preHora ? adicionarMinutos(preHora, 30) : '')
      setValor(0)
      setComissaoPct(0)
      setCustoProd(0)
      setObs('')
      setRealizado(false)
      setItemId('')
      setTipoItem('servico')
      setStatus('agendada')
      setDescontoAtivo(false)
      setDescontoValor(0)
      setFormaPag('')
      setParcelas(1)
      setStatusPag('pendente')
      setComissaoLock(true)
      setCustoLock(true)
      setLembResponsavelId('')
      buscarProxNumProc()
    }

    setBloqFuncId(preFuncId || '')
    setBloqData(preData || '')
    setBloqHoraInicio(preHora || '')
    setBloqHoraFim(preHora ? adicionarMinutos(preHora, 60) : '')
    setBloqMotivo('')
    setLembData(preData || '')
    setLembHora(preHora || '')
    setLembTitulo('')
    setLembObs('')
  }, [aberto])

  async function buscarProxNumProc() {
    const { data: rows } = await supabase
      .from('procedimentos')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
    const ultimo = rows?.[0]?.numero ? parseInt(rows[0].numero) : 0
    setNumProc(formatarNumero(ultimo + 1))
  }

  // Atualiza comissão, custo e duração ao trocar item/funcionária
  function atualizarCamposItem(iId: string, iTipo: 'servico' | 'pacote', fId: string) {
    const sf = sfuncs.find(
      (s) => s.funcionaria_id === fId && s.item_id === iId && s.item_tipo === iTipo,
    )
    const func = funcionarias.find((f) => f.id === fId)
    setComissaoPct(sf?.comissao_pct ?? func?.comissao_pct ?? 0)

    // Se abrir o modal sem slot clicado ("+ Criar"), preenche Hora início com o próximo slot
    // disponível para que Hora fim possa ser calculada a partir da duração do serviço.
    const inicio = horaInicio || proximoSlot(data || hoje(), hoje())
    if (!horaInicio) setHoraInicio(inicio)

    if (iTipo === 'servico') {
      const serv = servicos.find((s) => s.id === iId)
      setCustoProd(serv?.custo_geral ?? 0)
      // Fallback para 30 min quando o serviço não tem duração cadastrada (null, undefined ou 0)
      const dur = serv?.duracao_minutos && serv.duracao_minutos > 0 ? serv.duracao_minutos : 30
      setDuracaoSessao(dur)
      setHoraFim(adicionarMinutos(inicio, dur))
      setValor(serv?.preco ?? 0)
    } else {
      const pac = pacotes.find((p) => p.id === iId)
      setValor(pac?.preco_total ?? 0)
      // Bloco 5: busca custo do produto no serviço base do pacote
      if (pac?.servico_id) {
        const servBase = servicos.find((s) => s.id === pac.servico_id)
        setCustoProd(servBase?.custo_geral ?? 0)
      } else {
        setCustoProd(0)
      }
      setDuracaoSessao(30)
      // Duração padrão de 30 min para pacotes
      setHoraFim(adicionarMinutos(inicio, 30))
    }
  }

  const valorFinal = descontoAtivo
    ? descontoTipo === 'pct'
      ? valor * (1 - descontoValor / 100)
      : valor - descontoValor
    : valor

  // Salvar bloqueio
  async function salvarBloqueio() {
    if (!bloqFuncId || !bloqData) { toast.error('Preencha funcionária e data.'); return }
    setSalvando(true)
    const func = funcionarias.find((f) => f.id === bloqFuncId)
    const { error } = await supabase.from('sessoes').insert({
      id: gerarId(),
      funcionaria_id: bloqFuncId,
      funcionaria_nome: func?.nome || '',
      data: bloqData,
      hora: bloqHoraInicio || null,
      status: 'bloqueio',
      item_nome: bloqMotivo || 'Bloqueado',
      valor_servico: 0, comissao_pct: 0, comissao_valor: 0, custo_produto: 0,
    })
    setSalvando(false)
    if (error) { toast.error('Erro ao salvar bloqueio.'); return }
    toast.success('Horário bloqueado!')
    onFechar(); onSalvo()
  }

  // Salvar lembrete
  async function salvarLembrete() {
    if (!lembTitulo || !lembData) { toast.error('Preencha título e data.'); return }
    setSalvando(true)
    const resp = funcionarias.find((f) => f.id === lembResponsavelId)
    const { error } = await supabase.from('sessoes').insert({
      id: gerarId(),
      data: lembData,
      hora: lembHora || null,
      status: 'lembrete',
      item_nome: lembTitulo,
      valor_servico: 0, comissao_pct: 0, comissao_valor: 0, custo_produto: 0,
      responsavel_id: lembResponsavelId || null,
      responsavel_nome: resp?.nome || null,
    })
    setSalvando(false)
    if (error) { toast.error('Erro ao salvar lembrete.'); return }
    toast.success('Lembrete criado!')
    onFechar(); onSalvo()
  }

  // Marcar sessão como realizada — gera apenas comissão (sem lançamento financeiro)
  async function marcarRealizado() {
    if (!sessao) return
    const valServ = valorFinal || sessao.valor_servico
    const custo = custoProd
    const pct = comissaoPct
    const r = calcularComissao(valServ, custo, pct)
    const func = funcionarias.find((f) => f.id === (funcId || sessao.funcionaria_id))

    await supabase
      .from('sessoes')
      .update({ status: 'realizada', realizada_em: new Date().toISOString() })
      .eq('id', sessao.id)

    // Gera apenas comissão — lançamento financeiro é gerado ao marcar o procedimento como pago
    await supabase.from('comissoes').insert({
      id: gerarId(),
      funcionaria_id: funcId || sessao.funcionaria_id,
      funcionaria_nome: func?.nome || sessao.funcionaria_nome,
      cliente_nome: sessao.cliente_nome,
      sessao_id: sessao.id,
      procedimento_id: sessao.procedimento_id,
      servico: sessao.item_nome,
      valor_servico: valServ,
      pct_comissao: pct,
      valor_produto: custo,
      base: r.base,
      comissao_bruta: r.comissao_bruta,
      comissao_liquida: r.comissao_liquida,
      valor_clinica: r.valor_clinica,
      status: 'a_pagar',
    })

    toast.success('Sessão marcada como realizada!')
    onFechar(); onSalvo()
  }

  async function excluirSessao() {
    if (!sessao) return
    await supabase.from('sessoes').delete().eq('id', sessao.id)
    toast.success('Excluído.')
    onFechar(); onSalvo()
  }

  // Salvar / editar agendamento
  async function salvarAgendamento() {
    if (modoEdicao) {
      if (!funcId || !data) { toast.error('Preencha funcionária e data.'); return }
    } else {
      if (!clienteId || !itemId || !funcId || !data) {
        toast.error('Preencha cliente, item, funcionária e data.')
        return
      }
    }
    setSalvando(true)

    const cliente = clientes.find((c) => c.id === clienteId)
    const func = funcionarias.find((f) => f.id === funcId)
    const itemNome = itemId
      ? (tipoItem === 'servico'
          ? servicos.find((s) => s.id === itemId)?.nome || ''
          : pacotes.find((p) => p.id === itemId)?.nome || '')
      : (sessao?.item_nome || '')

    if (modoEdicao && sessao) {
      const novoStatus = realizado
        ? 'realizada'
        : sessao.status === 'pendente' && data
          ? 'agendada'
          : (status as Sessao['status'])

      const { error } = await supabase
        .from('sessoes')
        .update({
          cliente_id: clienteId || sessao.cliente_id,
          cliente_nome: cliente?.nome || sessao.cliente_nome || '',
          funcionaria_id: funcId,
          funcionaria_nome: func?.nome || '',
          item_nome: itemNome,
          valor_servico: valorFinal || sessao.valor_servico,
          data,
          hora: horaInicio || null,
          hora_fim: horaFim || null,
          status: novoStatus,
          comissao_pct: comissaoPct,
          custo_produto: custoProd,
        })
        .eq('id', sessao.id)

      setSalvando(false)
      if (error) { toast.error('Erro ao atualizar sessão.'); return }

      if (realizado && sessao.status !== 'realizada') {
        await marcarRealizado()
        return
      }

      // Propaga mudança de status de pagamento ao procedimento e gera/cancela lançamento
      if (sessao.procedimento_id && statusPag !== statusPagOriginal) {
        await supabase.from('procedimentos').update({ status_pagamento: statusPag }).eq('id', sessao.procedimento_id)
        if (statusPag === 'pago') {
          await supabase.from('lancamentos').insert({
            id: gerarId(), data: hoje(), tipo: 'entrada',
            descricao: `Procedimento #${sessao.procedimento_numero} — ${sessao.item_nome} — ${sessao.cliente_nome}`,
            valor: valorProcedimento || valorFinal || sessao.valor_servico,
            conta: 'cnpj', categoria: 'Procedimento',
            procedimento_id: sessao.procedimento_id, cancelado: false,
          })
          toast.success('Pagamento registrado e lançamento financeiro gerado!')
        } else if (statusPagOriginal === 'pago') {
          await supabase.from('lancamentos').update({ cancelado: true }).eq('procedimento_id', sessao.procedimento_id)
          toast.success('Pagamento revertido e lançamento cancelado.')
        } else {
          toast.success('Sessão atualizada!')
        }
        onFechar(); onSalvo()
        return
      }

      const msg = sessao.status === 'pendente' ? 'Sessão agendada!' : 'Sessão atualizada!'
      toast.success(msg)
      onFechar(); onSalvo()
      return
    }

    // Novo agendamento: insere procedimento
    const idProc = gerarId()
    await supabase.from('procedimentos').insert({
      id: idProc,
      numero: numProc,
      cliente_id: clienteId,
      cliente_nome: cliente?.nome || '',
      tipo: tipoItem,
      item_id: itemId,
      item_nome: itemNome,
      desconto_pct: descontoAtivo && descontoTipo === 'pct' ? descontoValor : 0,
      desconto_valor: descontoAtivo && descontoTipo === 'valor' ? descontoValor : 0,
      valor_original: valor,
      valor_final: valorFinal,
      status_pagamento: statusPag,
      forma_pagamento: formaPag || null,
      parcelas: formaPag === 'parcelado' ? parcelas : 1,
      valor_pago: 0,
      cancelado: false,
    })

    // Se já criou marcado como pago, gera o lançamento financeiro imediatamente
    if (statusPag === 'pago') {
      await supabase.from('lancamentos').insert({
        id: gerarId(),
        data: hoje(),
        tipo: 'entrada',
        descricao: `Procedimento #${numProc} — ${itemNome} — ${cliente?.nome || ''}`,
        valor: valorFinal,
        conta: 'cnpj',
        categoria: 'Procedimento',
        procedimento_id: idProc,
        cancelado: false,
      })
    }

    if (tipoItem === 'pacote') {
      // Bloco 6: sessão 1 já agendada com os dados do modal; demais ficam pendentes
      const pac = pacotes.find((p) => p.id === itemId)
      const n = pac?.num_sessoes || 1
      const valorSessao = valorFinal / n
      const sessoesInsert = Array.from({ length: n }, (_, i) => ({
        id: gerarId(),
        procedimento_id: idProc,
        procedimento_numero: numProc,
        cliente_id: clienteId,
        cliente_nome: cliente?.nome || '',
        item_nome: itemNome,
        valor_servico: valorSessao,
        // Sessão 1: agendada com dados preenchidos; demais: pendentes sem data
        data: i === 0 ? data : null,
        hora: i === 0 ? (horaInicio || null) : null,
        hora_fim: i === 0 ? (horaFim || null) : null,
        funcionaria_id: i === 0 ? funcId : null,
        funcionaria_nome: i === 0 ? (func?.nome || '') : null,
        status: i === 0 ? 'agendada' : 'pendente',
        comissao_pct: comissaoPct,
        comissao_valor: 0,
        custo_produto: n > 1 ? custoProd / n : custoProd,
        numero_sessao: i + 1,
        total_sessoes: n,
      }))

      const { error } = await supabase.from('sessoes').insert(sessoesInsert)
      setSalvando(false)
      if (error) { toast.error('Erro ao criar sessões.'); return }
      toast.success(`Sessão 1 agendada + ${n - 1} sessão(ões) pendente(s) — ${itemNome}`)
    } else {
      // Serviço avulso: 1 sessão agendada
      const { error } = await supabase.from('sessoes').insert({
        id: gerarId(),
        procedimento_id: idProc,
        procedimento_numero: numProc,
        cliente_id: clienteId,
        cliente_nome: cliente?.nome || '',
        funcionaria_id: funcId,
        funcionaria_nome: func?.nome || '',
        item_nome: itemNome,
        valor_servico: valorFinal,
        data,
        hora: horaInicio || null,
        hora_fim: horaFim || null,
        status: 'agendada',
        comissao_pct: comissaoPct,
        comissao_valor: 0,
        custo_produto: custoProd,
      })
      setSalvando(false)
      if (error) { toast.error('Erro ao criar agendamento.'); return }
      toast.success('Agendamento criado!')
    }

    onFechar(); onSalvo()
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {modoEdicao ? 'Editar agendamento' : 'Novo agendamento'}
          </DialogTitle>
        </DialogHeader>

        {/* Seletor de tipo (apenas para novos) */}
        {!modoEdicao && (
          <div className="flex rounded-lg border bg-gray-50 p-0.5 gap-0.5">
            {(['agendamento', 'bloqueio', 'lembrete'] as TipoModal[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={cn(
                  'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                  tipo === t
                    ? 'bg-[#7C3AED] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {t === 'agendamento' ? 'Agendamento' : t === 'bloqueio' ? 'Bloqueio de horário' : 'Lembrete'}
              </button>
            ))}
          </div>
        )}

        {/* Banner de sessão pendente */}
        {tipo === 'agendamento' && modoEdicao && sessao?.status === 'pendente' && (
          <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 text-sm text-purple-700">
            {sessao.numero_sessao && sessao.total_sessoes
              ? `Sessão ${sessao.numero_sessao} de ${sessao.total_sessoes} — ${sessao.item_nome || ''}`
              : sessao.item_nome || 'Agendar sessão'}
          </div>
        )}

        {tipo === 'agendamento' && (
          <FormAgendamento
            modoEdicao={modoEdicao}
            ehSessaoPendente={modoEdicao && sessao?.status === 'pendente'}
            numProc={numProc}
            buscaCliente={buscaCliente}
            setBuscaCliente={setBuscaCliente}
            clienteId={clienteId}
            setClienteId={setClienteId}
            clientesFiltrados={clientesFiltrados}
            tipoItem={tipoItem}
            setTipoItem={(t) => { setTipoItem(t); setItemId('') }}
            itemId={itemId}
            setItemId={(id) => { setItemId(id); atualizarCamposItem(id, tipoItem, funcId) }}
            funcId={funcId}
            setFuncId={(id) => { setFuncId(id); if (itemId) atualizarCamposItem(itemId, tipoItem, id) }}
            status={status}
            setStatus={setStatus}
            data={data}
            setData={setData}
            horaInicio={horaInicio}
            setHoraInicio={(h) => { setHoraInicio(h); setHoraFim(adicionarMinutos(h, duracaoSessao)) }}
            horaFim={horaFim}
            setHoraFim={setHoraFim}
            valor={valor}
            setValor={setValor}
            descontoAtivo={descontoAtivo}
            setDescontoAtivo={setDescontoAtivo}
            descontoTipo={descontoTipo}
            setDescontoTipo={setDescontoTipo}
            descontoValor={descontoValor}
            setDescontoValor={setDescontoValor}
            valorFinal={valorFinal}
            formaPag={formaPag}
            setFormaPag={setFormaPag}
            parcelas={parcelas}
            setParcelas={setParcelas}
            statusPag={statusPag}
            setStatusPag={setStatusPag}
            comissaoPct={comissaoPct}
            setComissaoPct={setComissaoPct}
            comissaoLock={comissaoLock}
            setComissaoLock={setComissaoLock}
            custoProd={custoProd}
            setCustoProd={setCustoProd}
            custoLock={custoLock}
            setCustoLock={setCustoLock}
            obs={obs}
            setObs={setObs}
            realizado={realizado}
            setRealizado={setRealizado}
            funcionarias={funcionarias}
            servicos={servicos}
            pacotes={pacotes}
          />
        )}

        {tipo === 'bloqueio' && (
          <FormBloqueio
            funcionarias={funcionarias}
            funcId={bloqFuncId}
            setFuncId={setBloqFuncId}
            data={bloqData}
            setData={setBloqData}
            horaInicio={bloqHoraInicio}
            setHoraInicio={setBloqHoraInicio}
            horaFim={bloqHoraFim}
            setHoraFim={setBloqHoraFim}
            motivo={bloqMotivo}
            setMotivo={setBloqMotivo}
          />
        )}

        {tipo === 'lembrete' && (
          <FormLembrete
            titulo={lembTitulo}
            setTitulo={setLembTitulo}
            data={lembData}
            setData={setLembData}
            hora={lembHora}
            setHora={setLembHora}
            obs={lembObs}
            setObs={setLembObs}
            responsavelId={lembResponsavelId}
            setResponsavelId={setLembResponsavelId}
            funcionarias={funcionarias}
          />
        )}

        {modoEdicao && sessao && (
          confirmandoExclusao ? (
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={excluirSessao}>
                Confirmar exclusão
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setConfirmandoExclusao(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => setConfirmandoExclusao(true)}
            >
              <Trash2 size={14} className="mr-1" />
              Excluir
            </Button>
          )
        )}

        <Button
          className="w-full bg-[#7C3AED] hover:bg-purple-700 text-white"
          onClick={
            tipo === 'bloqueio' ? salvarBloqueio
              : tipo === 'lembrete' ? salvarLembrete
                : salvarAgendamento
          }
          disabled={salvando}
        >
          {salvando ? 'Salvando...' : modoEdicao ? 'Salvar alterações' : 'Criar'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// Sub-formulário: Agendamento
type FormAgendamentoProps = {
  modoEdicao: boolean
  ehSessaoPendente?: boolean
  numProc: string
  buscaCliente: string
  setBuscaCliente: (v: string) => void
  clienteId: string
  setClienteId: (v: string) => void
  clientesFiltrados: Cliente[]
  tipoItem: 'servico' | 'pacote'
  setTipoItem: (v: 'servico' | 'pacote') => void
  itemId: string
  setItemId: (v: string) => void
  funcId: string
  setFuncId: (v: string) => void
  status: string
  setStatus: (v: string) => void
  data: string
  setData: (v: string) => void
  horaInicio: string
  setHoraInicio: (v: string) => void
  horaFim: string
  setHoraFim: (v: string) => void
  valor: number
  setValor: (v: number) => void
  descontoAtivo: boolean
  setDescontoAtivo: (v: boolean) => void
  descontoTipo: 'pct' | 'valor'
  setDescontoTipo: (v: 'pct' | 'valor') => void
  descontoValor: number
  setDescontoValor: (v: number) => void
  valorFinal: number
  formaPag: string
  setFormaPag: (v: string) => void
  parcelas: number
  setParcelas: (v: number) => void
  statusPag: string
  setStatusPag: (v: string) => void
  comissaoPct: number
  setComissaoPct: (v: number) => void
  comissaoLock: boolean
  setComissaoLock: (v: boolean) => void
  custoProd: number
  setCustoProd: (v: number) => void
  custoLock: boolean
  setCustoLock: (v: boolean) => void
  obs: string
  setObs: (v: string) => void
  realizado: boolean
  setRealizado: (v: boolean) => void
  funcionarias: Funcionaria[]
  servicos: Servico[]
  pacotes: Pacote[]
}

function FormAgendamento(p: FormAgendamentoProps) {
  const [clienteDropAberto, setClienteDropAberto] = useState(false)
  const [buscaItem, setBuscaItem] = useState('')
  const [itemDropAberto, setItemDropAberto] = useState(false)

  useEffect(() => { setBuscaItem('') }, [p.tipoItem])

  return (
    <div className="space-y-3">
      {p.numProc && (
        <p className="text-xs text-gray-400">Procedimento #{p.numProc}</p>
      )}

      {/* Cliente */}
      <div className="space-y-1">
        <Label>Cliente</Label>
        <div className="relative">
          <Input
            placeholder="Buscar cliente..."
            value={p.buscaCliente}
            disabled={p.ehSessaoPendente}
            onChange={(e) => { p.setBuscaCliente(e.target.value); p.setClienteId(''); setClienteDropAberto(true) }}
            onFocus={() => setClienteDropAberto(true)}
            onBlur={() => setTimeout(() => setClienteDropAberto(false), 150)}
          />
          {clienteDropAberto && p.clientesFiltrados.length > 0 && (
            <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto rounded-lg border bg-white shadow-md">
              {p.clientesFiltrados.slice(0, 20).map((c) => (
                <button
                  key={c.id}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                  onMouseDown={() => { p.setClienteId(c.id); p.setBuscaCliente(c.nome); setClienteDropAberto(false) }}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toggle Serviço / Pacote — oculto ao agendar sessão pendente de pacote */}
      {!p.ehSessaoPendente && (
        <div className="flex rounded-lg border bg-gray-50 p-1 gap-1">
          {(['servico', 'pacote'] as const).map((t) => (
            <button key={t} onClick={() => p.setTipoItem(t)}
              className={cn('flex-1 rounded-md py-2 px-3 text-sm font-medium transition-colors',
                p.tipoItem === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500')}>
              {t === 'servico' ? 'Serviço' : 'Pacote'}
            </button>
          ))}
        </div>
      )}

      {/* Item — oculto ao agendar sessão pendente (já definido no pacote) */}
      {!p.ehSessaoPendente && (
        <div className="space-y-1">
          <Label>{p.tipoItem === 'servico' ? 'Serviço' : 'Pacote'}</Label>
          <div className="relative">
            <Input
              placeholder={`Buscar ${p.tipoItem === 'servico' ? 'serviço' : 'pacote'}...`}
              value={buscaItem}
              onChange={(e) => { setBuscaItem(e.target.value); p.setItemId(''); setItemDropAberto(true) }}
              onFocus={() => setItemDropAberto(true)}
              onBlur={() => setTimeout(() => setItemDropAberto(false), 150)}
            />
            {itemDropAberto && (
              <div className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-md">
                {p.tipoItem === 'servico'
                  ? p.servicos
                      .filter((s) => !buscaItem || s.nome.toLowerCase().includes(buscaItem.toLowerCase()))
                      .slice(0, 30)
                      .map((s) => (
                        <button
                          key={s.id}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                          onMouseDown={() => { p.setItemId(s.id); setBuscaItem(s.nome); setItemDropAberto(false) }}
                        >
                          {s.nome}
                        </button>
                      ))
                  : p.pacotes
                      .filter((pac) => !buscaItem || pac.nome.toLowerCase().includes(buscaItem.toLowerCase()))
                      .slice(0, 30)
                      .map((pac) => (
                        <button
                          key={pac.id}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                          onMouseDown={() => {
                            p.setItemId(pac.id)
                            setBuscaItem(`${pac.nome} — ${pac.num_sessoes} sessões — ${formatarMoeda(pac.preco_total)}`)
                            setItemDropAberto(false)
                          }}
                        >
                          {pac.nome} — {pac.num_sessoes} sessões — {formatarMoeda(pac.preco_total)}
                        </button>
                      ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Funcionária */}
      <div className="space-y-1">
        <Label>Funcionária</Label>
        <Select value={p.funcId} onValueChange={(v) => p.setFuncId(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione...">
              {(() => { const f = p.funcionarias.find((f) => f.id === p.funcId); return f ? <span className="flex items-center gap-2"><AvatarInitiais nome={f.nome} tamanho={20} />{f.nome}</span> : undefined })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {p.funcionarias.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                <span className="flex items-center gap-2"><AvatarInitiais nome={f.nome} tamanho={20} />{f.nome}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={p.status} onValueChange={(v) => p.setStatus(v ?? '')}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="agendada">Agendado</SelectItem>
            <SelectItem value="confirmada">Confirmado</SelectItem>
            <SelectItem value="cancelada">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data e horas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label>Data</Label>
          <Input type="date" value={p.data} onChange={(e) => p.setData(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Hora início</Label>
          <Select value={p.horaInicio} onValueChange={(v) => p.setHoraInicio(v ?? '')}>
            <SelectTrigger className="w-full"><SelectValue placeholder="--:--" /></SelectTrigger>
            <SelectContent>{SLOTS_MODAL.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Hora fim</Label>
          <Select value={p.horaFim} onValueChange={(v) => p.setHoraFim(v ?? '')}>
            <SelectTrigger className="w-full"><SelectValue placeholder="--:--" /></SelectTrigger>
            <SelectContent>{SLOTS_MODAL.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Preço — oculto para sessões pendentes de pacote */}
      {!p.ehSessaoPendente && (
        <div className="space-y-1">
          <Label>Preço</Label>
          <CurrencyInput value={p.valor} onChange={p.setValor} />
        </div>
      )}

      {!p.ehSessaoPendente && (
        <>
          {/* Desconto */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="desconto-toggle" checked={p.descontoAtivo}
                onChange={(e) => p.setDescontoAtivo(e.target.checked)} className="rounded" />
              <Label htmlFor="desconto-toggle" className="cursor-pointer font-normal">Aplicar desconto</Label>
            </div>
            {p.descontoAtivo && (
              <div className="flex items-center gap-2 mt-1">
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" name="desc-tipo" checked={p.descontoTipo === 'pct'} onChange={() => p.setDescontoTipo('pct')} />%
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="radio" name="desc-tipo" checked={p.descontoTipo === 'valor'} onChange={() => p.setDescontoTipo('valor')} />R$
                </label>
                <Input type="number" min={0} value={p.descontoValor || ''} onChange={(e) => p.setDescontoValor(Number(e.target.value))} className="w-24" placeholder="0" />
                <span className="text-xs text-gray-500">Final: {formatarMoeda(p.valorFinal)}</span>
              </div>
            )}
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1">
            <Label>Forma de pagamento</Label>
            <Select value={p.formaPag} onValueChange={(v) => p.setFormaPag(v ?? '')}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="parcelado">Parcelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {p.formaPag === 'parcelado' && (
            <div className="space-y-1">
              <Label>Parcelas</Label>
              <Input type="number" min={2} max={24} value={p.parcelas} onChange={(e) => p.setParcelas(Number(e.target.value))} />
            </div>
          )}

          {/* Status de pagamento */}
          <div className="space-y-1">
            <Label>Status de pagamento</Label>
            <Select value={p.statusPag} onValueChange={(v) => p.setStatusPag(v ?? '')}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Comissão % — travado com botão editar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Comissão (%)</Label>
          <button onClick={() => p.setComissaoLock(!p.comissaoLock)} className="text-xs text-purple-600 hover:underline">✎ Editar</button>
        </div>
        <Input type="number" min={0} max={100}
          value={p.comissaoPct === 0 ? '' : p.comissaoPct}
          onChange={(e) => p.setComissaoPct(e.target.value === '' ? 0 : +e.target.value)}
          disabled={p.comissaoLock} className={p.comissaoLock ? 'bg-gray-50 text-gray-400' : ''} />
      </div>

      {/* Custo do produto */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label>Custo do produto</Label>
          <button onClick={() => p.setCustoLock(!p.custoLock)} className="text-xs text-purple-600 hover:underline">✎ Editar</button>
        </div>
        <CurrencyInput value={p.custoProd} onChange={p.setCustoProd} disabled={p.custoLock} />
      </div>

      {/* Observações — oculto para sessões pendentes de pacote */}
      {!p.ehSessaoPendente && (
        <div className="space-y-1">
          <Label>Observações</Label>
          <textarea className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring resize-none"
            rows={2} value={p.obs} onChange={(e) => p.setObs(e.target.value)} placeholder="Observações opcionais..." />
        </div>
      )}

      {/* Marcar como realizado */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={p.realizado} onChange={(e) => p.setRealizado(e.target.checked)} className="rounded" />
        <span className="text-sm text-gray-700">✓ Marcar como realizado</span>
      </label>
    </div>
  )
}

// Sub-formulário: Bloqueio
type FormBloqueioProps = {
  funcionarias: Funcionaria[]
  funcId: string; setFuncId: (v: string) => void
  data: string; setData: (v: string) => void
  horaInicio: string; setHoraInicio: (v: string) => void
  horaFim: string; setHoraFim: (v: string) => void
  motivo: string; setMotivo: (v: string) => void
}

function FormBloqueio(p: FormBloqueioProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Funcionária</Label>
        <Select value={p.funcId} onValueChange={(v) => p.setFuncId(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione...">{p.funcionarias.find((f) => f.id === p.funcId)?.nome}</SelectValue>
          </SelectTrigger>
          <SelectContent>{p.funcionarias.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Data</Label>
        <Input type="date" value={p.data} onChange={(e) => p.setData(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Hora início</Label>
          <Select value={p.horaInicio} onValueChange={(v) => p.setHoraInicio(v ?? '')}>
            <SelectTrigger className="w-full"><SelectValue placeholder="--:--" /></SelectTrigger>
            <SelectContent>{SLOTS_MODAL.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Hora fim</Label>
          <Select value={p.horaFim} onValueChange={(v) => p.setHoraFim(v ?? '')}>
            <SelectTrigger className="w-full"><SelectValue placeholder="--:--" /></SelectTrigger>
            <SelectContent>{SLOTS_MODAL.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Motivo (opcional)</Label>
        <Input placeholder="Ex: Intervalo, Reunião..." value={p.motivo} onChange={(e) => p.setMotivo(e.target.value)} />
      </div>
    </div>
  )
}

// Sub-formulário: Lembrete (Bloco 7 — com responsável)
type FormLembreteProps = {
  titulo: string; setTitulo: (v: string) => void
  data: string; setData: (v: string) => void
  hora: string; setHora: (v: string) => void
  obs: string; setObs: (v: string) => void
  responsavelId: string; setResponsavelId: (v: string) => void
  funcionarias: Funcionaria[]
}

function FormLembrete(p: FormLembreteProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Título *</Label>
        <Input placeholder="Título do lembrete..." value={p.titulo} onChange={(e) => p.setTitulo(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Responsável *</Label>
        <Select value={p.responsavelId} onValueChange={(v) => p.setResponsavelId(v ?? '')}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a responsável...">
              {p.funcionarias.find((f) => f.id === p.responsavelId)?.nome}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {p.funcionarias.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Data *</Label>
          <Input type="date" value={p.data} onChange={(e) => p.setData(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Hora</Label>
          <Select value={p.hora} onValueChange={(v) => p.setHora(v ?? '')}>
            <SelectTrigger className="w-full"><SelectValue placeholder="--:--" /></SelectTrigger>
            <SelectContent>{SLOTS_MODAL.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Observações</Label>
        <textarea className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring resize-none"
          rows={3} value={p.obs} onChange={(e) => p.setObs(e.target.value)} placeholder="Observações opcionais..." />
      </div>
    </div>
  )
}
