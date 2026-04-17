'use client'

import { corPorNome, getCorFuncionaria, inicialNome } from '@/lib/utils'

type Props = {
  nome: string
  tamanho?: number
  className?: string
  // Índice da funcionária na lista ordenada — quando passado, usa a paleta sincronizada com a agenda
  indice?: number
}

export function AvatarInitiais({ nome, tamanho = 36, className = '', indice }: Props) {
  const cor = indice !== undefined ? getCorFuncionaria(indice) : corPorNome(nome)
  const inicial = inicialNome(nome)

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ width: tamanho, height: tamanho, backgroundColor: cor, fontSize: tamanho * 0.4 }}
    >
      {inicial}
    </div>
  )
}
