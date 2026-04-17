'use client'

import { Inbox } from 'lucide-react'

type Props = { mensagem?: string }

export function EstadoVazio({ mensagem = 'Nenhum registro encontrado.' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
      <Inbox className="h-10 w-10" />
      <p className="text-sm">{mensagem}</p>
    </div>
  )
}
