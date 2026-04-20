'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { setSessao, getSessao } from '@/lib/auth'
import { supabase, Funcionaria } from '@/lib/supabase'
import { toast } from 'sonner'

type Modo = 'gestor' | 'funcionaria'

export default function LoginPage() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('gestor')
  const [senha, setSenha] = useState('')
  const [funcionariaId, setFuncionariaId] = useState('')
  const [funcionarias, setFuncionarias] = useState<Funcionaria[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const s = getSessao()
    if (s) router.replace(s.modo === 'gestor' ? '/dashboard' : '/agenda')
  }, [router])

  useEffect(() => {
    if (modo === 'funcionaria') carregarFuncionarias()
  }, [modo])

  async function carregarFuncionarias() {
    const { data } = await supabase.from('funcionarias').select('*').eq('ativo', true).order('nome')
    setFuncionarias(data || [])
  }

  async function handleLogin() {
    setCarregando(true)
    try {
      if (modo === 'gestor') {
        const senhaCerta = process.env.NEXT_PUBLIC_GESTOR_PASSWORD || 'dani2025'
        if (senha !== senhaCerta) {
          toast.error('Senha incorreta.')
          return
        }
        setSessao({ modo: 'gestor' })
        router.replace('/dashboard')
      } else {
        if (!funcionariaId) { toast.error('Selecione a funcionária.'); return }
        const func = funcionarias.find(f => f.id === funcionariaId)
        if (!func) { toast.error('Funcionária não encontrada.'); return }
        if (func.senha && func.senha !== senha) {
          toast.error('Senha incorreta.')
          return
        }
        setSessao({ modo: 'funcionaria', id: func.id, nome: func.nome })
        router.replace('/agenda')
      }
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F4F8] px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600">
            <span className="text-2xl font-bold text-white">D</span>
          </div>
          <CardTitle className="text-xl">Dani Danios</CardTitle>
          <p className="text-sm text-gray-500">Dashboard de gestão</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex rounded-lg border bg-gray-50 p-1">
            {(['gestor', 'funcionaria'] as Modo[]).map(m => (
              <button
                key={m}
                onClick={() => { setModo(m); setSenha(''); setFuncionariaId('') }}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  modo === m ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'
                }`}
              >
                {m === 'gestor' ? 'Gestor' : 'Funcionária'}
              </button>
            ))}
          </div>

          {modo === 'funcionaria' && (
            <div className="space-y-1">
              <Label>Funcionária</Label>
              <Select value={funcionariaId} onValueChange={v => setFuncionariaId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione...">
                    {funcionarias.find(f => f.id === funcionariaId)?.nome}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {funcionarias.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Senha</Label>
            <Input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
            />
          </div>

          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={handleLogin}
            disabled={carregando}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
