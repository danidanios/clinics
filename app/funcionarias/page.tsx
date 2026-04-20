'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { supabase, Funcionaria } from '@/lib/supabase'
import { gerarId, getCorFuncionaria } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, User } from 'lucide-react'

export default function FuncionariasPage() {
  const [funcionarias, setFuncionarias] = useState<Funcionaria[]>([])
  const [modal, setModal] = useState(false)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'profissional' | 'secretaria'>('profissional')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    // Ordena por criado_em para manter índice de cor consistente com a agenda
    const { data } = await supabase.from('funcionarias').select('*').order('criado_em')
    setFuncionarias(data || [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function salvar() {
    if (!nome.trim()) { toast.error('Informe o nome.'); return }
    setSalvando(true)
    await supabase.from('funcionarias').insert({
      id: gerarId(), nome: nome.trim(), comissao_pct: 0, ativo: true, tipo,
    })
    toast.success('Funcionária cadastrada!')
    setModal(false); setNome(''); setTipo('profissional'); setSalvando(false)
    carregar()
  }

  async function toggleAtivo(f: Funcionaria) {
    await supabase.from('funcionarias').update({ ativo: !f.ativo }).eq('id', f.id)
    carregar()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Funcionárias"
        acoes={
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setModal(true)}>
            <Plus size={14} className="mr-1" /> Nova
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {funcionarias.map((f, idx) => (
          <Card key={f.id}>
            <CardContent className="flex items-center gap-3 p-4">
              {/* Bloco 11: índice passa a cor sincronizada com a agenda */}
              <AvatarInitiais nome={f.nome} tamanho={40} indice={idx} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{f.nome}</p>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <Badge variant={f.ativo ? 'default' : 'secondary'} className="text-xs">
                    {f.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                  {/* Bloco 9: badge de tipo */}
                  <Badge
                    className={`text-xs ${f.tipo === 'secretaria' ? 'bg-gray-200 text-gray-700' : 'bg-purple-100 text-purple-700'}`}
                    variant="secondary"
                  >
                    {f.tipo === 'secretaria' ? 'Secretária' : 'Profissional'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Link href={`/funcionarias/${f.id}`}>
                  <Button size="sm" variant="outline" className="text-xs"><User size={12} className="mr-1" />Perfil</Button>
                </Link>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => toggleAtivo(f)}>
                  {f.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova funcionária</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            {/* Bloco 9: campo tipo */}
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={v => setTipo(v as 'profissional' | 'secretaria')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="profissional">Profissional de estética</SelectItem>
                  <SelectItem value="secretaria">Secretária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
