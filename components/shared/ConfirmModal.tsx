'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  aberto: boolean
  titulo?: string
  mensagem: string
  onConfirmar: () => void
  onCancelar: () => void
  carregando?: boolean
}

export function ConfirmModal({
  aberto,
  titulo = 'Confirmar ação',
  mensagem,
  onConfirmar,
  onCancelar,
  carregando,
}: Props) {
  return (
    <Dialog open={aberto} onOpenChange={v => !v && onCancelar()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{mensagem}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancelar} disabled={carregando}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirmar} disabled={carregando}>
            {carregando ? 'Aguarde...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
