'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/layout/PageHeader'
import { AvatarInitiais } from '@/components/shared/AvatarInitiais'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { EstadoVazio } from '@/components/shared/EstadoVazio'
import { supabase, Cliente } from '@/lib/supabase'
import { gerarId, hoje } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Search, MoreVertical, MessageCircle, Download } from 'lucide-react'

const CLIENTE_VAZIO: Partial<Cliente> = {
  nome: '', telefone: '', email: '', sexo: '', observacoes: '', etiquetas: [], ativo: true,
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Partial<Cliente>>(CLIENTE_VAZIO)
  const [tagInput, setTagInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [excluirId, setExcluirId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data } = await supabase.from('clientes').select('*').order('nome')
    setClientes(data || [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() {
    setForm({ ...CLIENTE_VAZIO, id: gerarId(), criado_em: new Date().toISOString() })
    setTagInput('')
    setModal(true)
  }

  function abrirEditar(c: Cliente) {
    setForm({ ...c })
    setTagInput('')
    setModal(true)
  }

  async function salvar() {
    if (!form.nome?.trim()) { toast.error('Informe o nome do cliente.'); return }
    setSalvando(true)
    if (form.id && clientes.find(c => c.id === form.id)) {
      await supabase.from('clientes').update({ ...form }).eq('id', form.id!)
      toast.success('Cliente atualizado!')
    } else {
      await supabase.from('clientes').insert({ ...form, id: form.id || gerarId() })
      toast.success('Cliente cadastrado!')
    }
    setModal(false)
    setSalvando(false)
    carregar()
  }

  async function excluir() {
    if (!excluirId) return
    await supabase.from('clientes').delete().eq('id', excluirId)
    setExcluirId(null)
    toast.success('Cliente excluído.')
    carregar()
  }

  async function toggleAtivo(c: Cliente) {
    await supabase.from('clientes').update({ ativo: !c.ativo }).eq('id', c.id)
    carregar()
  }

  function adicionarTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const tags = [...(form.etiquetas || []), tagInput.trim()]
      setForm({ ...form, etiquetas: tags })
      setTagInput('')
    }
  }

  function removerTag(tag: string) {
    setForm({ ...form, etiquetas: (form.etiquetas || []).filter(t => t !== tag) })
  }

  function exportarCSV() {
    const header = 'Nome,Telefone,Email,Ativo\n'
    const rows = clientes.map(c => `"${c.nome}","${c.telefone || ''}","${c.email || ''}","${c.ativo ? 'Sim' : 'Não'}"`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'clientes.csv'; a.click()
  }

  const filtrados = clientes.filter(c => {
    if (!busca) return true
    const b = busca.toLowerCase()
    return c.nome.toLowerCase().includes(b) || (c.etiquetas || []).some(t => t.toLowerCase().includes(b))
  })

  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Clientes"
        acoes={
          <>
            <Button size="sm" variant="outline" onClick={exportarCSV}><Download size={14} className="mr-1" />CSV</Button>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={abrirNovo}><Plus size={14} className="mr-1" />Novo</Button>
          </>
        }
      />

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Buscar por nome ou etiqueta..." className="pl-8" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {filtrados.length === 0 ? <EstadoVazio mensagem="Nenhum cliente encontrado." /> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Contato</th>
                <th className="px-4 py-2 text-center">Ativo</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrados.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <AvatarInitiais nome={c.nome} tamanho={32} />
                      <div>
                        <p className="font-medium text-gray-900">{c.nome}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {(c.etiquetas || []).map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {c.telefone ? (
                      <a
                        href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-green-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        <MessageCircle size={13} />
                        {c.telefone}
                      </a>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Switch checked={c.ativo} onCheckedChange={() => toggleAtivo(c)} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded p-1 hover:bg-gray-100">
                        <MoreVertical size={14} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEditar(c)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={() => setExcluirId(c.id)}>Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={modal} onOpenChange={v => !v && setModal(false)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-md">
          <DialogHeader><DialogTitle>{form.id && clientes.find(c => c.id === form.id) ? 'Editar' : 'Novo'} cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.nome || ''} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input value={form.telefone || ''} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Nascimento</Label>
                <Input type="date" value={form.nascimento || ''} onChange={e => setForm({ ...form, nascimento: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Sexo</Label>
                <Select value={form.sexo || ''} onValueChange={v => setForm({ ...form, sexo: v ?? '' })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Etiquetas (Enter para adicionar)</Label>
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={adicionarTag}
                placeholder="VIP, Botox, ..."
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {(form.etiquetas || []).map(t => (
                  <button key={t} onClick={() => removerTag(t)}
                    className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-200">
                    {t} ×
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.observacoes || ''} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo ?? true} onCheckedChange={v => setForm({ ...form, ativo: v })} />
              <Label>Ativo</Label>
            </div>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        aberto={!!excluirId}
        mensagem="Deseja excluir este cliente? Esta ação não pode ser desfeita."
        onConfirmar={excluir}
        onCancelar={() => setExcluirId(null)}
      />
    </div>
  )
}
