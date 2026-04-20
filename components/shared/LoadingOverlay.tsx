'use client'

type Props = { visivel: boolean; mensagem?: string }

export function LoadingOverlay({ visivel, mensagem = 'Carregando...' }: Props) {
  if (!visivel) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6 shadow-xl">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
        <p className="text-sm text-gray-600">{mensagem}</p>
      </div>
    </div>
  )
}
