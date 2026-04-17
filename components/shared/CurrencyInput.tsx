'use client'

import { useRef, ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = {
  value: number
  onChange: (valor: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function CurrencyInput({ value, onChange, className, placeholder = 'R$ 0,00', disabled }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  function formatar(n: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    const num = parseInt(raw || '0', 10) / 100
    onChange(num)
  }

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={value === 0 ? '' : formatar(value)}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(className)}
    />
  )
}
