'use client'

import { ReactNode } from 'react'

type Props = {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
}

export function PageHeader({ titulo, subtitulo, acoes }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{titulo}</h1>
        {subtitulo && <p className="mt-0.5 text-sm text-gray-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex items-center gap-2">{acoes}</div>}
    </div>
  )
}
