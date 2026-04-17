'use client'

import { toast } from 'sonner'

export function useToast() {
  return {
    sucesso: (msg: string) => toast.success(msg),
    erro: (msg: string) => toast.error(msg),
    aviso: (msg: string) => toast.warning(msg),
  }
}
