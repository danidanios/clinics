'use client'

import { useEffect, useState } from 'react'
import { ALTURA_HORA, HORA_INICIO } from './constants'

// Linha vermelha que indica o horário atual na grade
export function LinhaHoraAtual() {
  const [topo, setTopo] = useState(0)

  function calcularTopo(): number {
    const agora = new Date()
    const h = agora.getHours()
    const m = agora.getMinutes()
    return Math.max(0, ((h - HORA_INICIO) * 60 + m) * ALTURA_HORA / 60)
  }

  useEffect(() => {
    setTopo(calcularTopo())
    // Atualiza a posição a cada minuto
    const intervalo = setInterval(() => setTopo(calcularTopo()), 60_000)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
      style={{ top: topo }}
    >
      {/* Bolinha na coluna de horários */}
      <div className="w-12 flex-shrink-0 flex justify-end pr-1">
        <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
      </div>
      {/* Linha vermelha percorrendo as colunas */}
      <div className="flex-1 border-t-2 border-red-500" />
    </div>
  )
}
