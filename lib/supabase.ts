import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anon)

// Tipos das tabelas
export type Funcionaria = {
  id: string
  nome: string
  comissao_pct: number
  ativo: boolean
  tipo?: 'profissional' | 'secretaria'
  senha?: string
  criado_em?: string
}

export type Lancamento = {
  id: string
  data: string
  tipo: 'entrada' | 'saida'
  descricao: string
  categoria?: string
  subcategoria?: string
  conta?: 'cnpj' | 'pessoal' | 'caixa'
  valor: number
  funcionaria_id?: string
  funcionaria_nome?: string
  observacao?: string
  destinatario?: string
  cliente?: string
  servico?: string
  forma_pagamento?: string
  cancelado?: boolean
  procedimento_id?: string
  criado_em?: string
}

export type Servico = {
  id: string
  nome: string
  custo_geral: number
  custos_detalhados: { descricao: string; fornecedor: string; valor: number }[]
  duracao_minutos?: number
  preco?: number
  criado_em?: string
}

export type Pacote = {
  id: string
  nome: string
  num_sessoes: number
  itens: { descricao: string; quantidade: number; valor_unit: number }[]
  preco_total: number
  duracao_minutos?: number
  servico_id?: string
  observacao?: string
  criado_em?: string
}

export type Cliente = {
  id: string
  nome: string
  telefone?: string
  email?: string
  nascimento?: string
  sexo?: string
  etiquetas: string[]
  foto_url?: string
  observacoes?: string
  ativo: boolean
  criado_em?: string
}

export type Procedimento = {
  id: string
  numero?: string
  cliente_id?: string
  cliente_nome?: string
  tipo: 'servico' | 'pacote'
  item_id?: string
  item_nome?: string
  desconto_pct: number
  desconto_valor: number
  valor_original: number
  valor_final: number
  status_pagamento: 'pendente' | 'parcial' | 'pago'
  forma_pagamento?: string
  parcelas: number
  valor_pago: number
  observacoes?: string
  cancelado?: boolean
  cancelado_em?: string
  criado_em?: string
}

export type Sessao = {
  id: string
  procedimento_id?: string
  procedimento_numero?: string
  cliente_id?: string
  cliente_nome?: string
  funcionaria_id?: string
  funcionaria_nome?: string
  item_nome?: string
  valor_servico: number
  data?: string
  hora?: string
  status: 'pendente' | 'agendada' | 'confirmada' | 'cancelada' | 'realizada' | 'bloqueio' | 'lembrete'
  comissao_pct: number
  comissao_valor: number
  custo_produto: number
  hora_fim?: string
  realizada_em?: string
  numero_sessao?: number
  total_sessoes?: number
  responsavel_id?: string
  responsavel_nome?: string
}

export type Comissao = {
  id: string
  funcionaria_id?: string
  funcionaria_nome?: string
  cliente_nome?: string
  sessao_id?: string
  procedimento_id?: string
  servico?: string
  valor_servico: number
  pct_comissao: number
  valor_produto: number
  base: number
  comissao_bruta: number
  comissao_liquida: number
  valor_clinica: number
  forma_pagamento?: string
  status: 'a_pagar' | 'pago' | 'cancelada'
  data_pagamento?: string
  criado_em?: string
}

export type ServFuncionaria = {
  id: string
  funcionaria_id: string
  item_id: string
  item_tipo: 'servico' | 'pacote'
  comissao_pct: number
}
