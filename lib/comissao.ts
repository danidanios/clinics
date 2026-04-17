// Fórmula de comissão conforme especificação
export type ResultadoComissao = {
  base: number
  comissao_bruta: number
  comissao_liquida: number
  valor_clinica: number
}

export function calcularComissao(
  valor_servico: number,
  custo_produto: number,
  pct: number
): ResultadoComissao {
  const base = valor_servico - custo_produto
  const comissao_bruta = valor_servico * (pct / 100)
  const comissao_liquida = base * (pct / 100)
  const valor_clinica = base - comissao_liquida
  return { base, comissao_bruta, comissao_liquida, valor_clinica }
}
