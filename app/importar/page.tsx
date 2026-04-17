'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/PageHeader'
import { supabase } from '@/lib/supabase'
import { gerarId, normalizarValor, hoje } from '@/lib/utils'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

type Linha = Record<string, string>
type MapaColunas = {
  data: string
  valor: string
  descricao: string
  tipo: string
  tipoFixo: 'entrada' | 'saida' | ''
  conta: 'cnpj' | 'pessoal' | 'dinheiro'
  categoria: string
}

function dataParaISO(v: string): string {
  if (!v) return hoje()
  // dd/mm/aaaa
  const m1 = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10)
  // número Excel (dias desde 1900)
  const n = parseFloat(v)
  if (!isNaN(n)) {
    const d = new Date((n - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]
  }
  return hoje()
}

export default function ImportarPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [colunas, setColunas] = useState<string[]>([])
  const [mapa, setMapa] = useState<MapaColunas>({
    data: '', valor: '', descricao: '', tipo: '', tipoFixo: '', conta: 'cnpj', categoria: '',
  })
  const [etapa, setEtapa] = useState<'upload' | 'mapa' | 'preview' | 'done'>('upload')
  const [progresso, setProgresso] = useState(0)
  const [importados, setImportados] = useState(0)
  const [falhas, setFalhas] = useState(0)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json: Linha[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' })
      if (json.length === 0) { toast.error('Planilha vazia.'); return }
      setColunas(Object.keys(json[0]))
      setLinhas(json)
      setEtapa('mapa')
    }
    reader.readAsArrayBuffer(f)
  }

  function preview(): Linha[] {
    return linhas.slice(0, 10)
  }

  function normalizar(l: Linha): { data: string; tipo: 'entrada' | 'saida'; descricao: string; valor: number; conta: string; categoria: string } | null {
    const data = dataParaISO(l[mapa.data] || '')
    const valor = normalizarValor(l[mapa.valor] || '0')
    const descricao = l[mapa.descricao] || ''
    let tipo: 'entrada' | 'saida' = mapa.tipoFixo || 'entrada'
    if (mapa.tipo && !mapa.tipoFixo) {
      const raw = (l[mapa.tipo] || '').toLowerCase()
      tipo = raw.includes('saida') || raw.includes('saída') || raw.includes('débito') || raw.includes('deb') ? 'saida' : 'entrada'
    }
    if (!descricao || isNaN(valor)) return null
    return { data, tipo, descricao, valor, conta: mapa.conta, categoria: mapa.categoria }
  }

  async function importar() {
    setEtapa('done')
    setProgresso(0); setImportados(0); setFalhas(0)
    const lotes: Linha[][] = []
    for (let i = 0; i < linhas.length; i += 200) lotes.push(linhas.slice(i, i + 200))

    let totalImportados = 0, totalFalhas = 0
    for (let i = 0; i < lotes.length; i++) {
      const rows = lotes[i].map(l => {
        const n = normalizar(l)
        if (!n) return null
        return { id: gerarId(), ...n }
      }).filter(Boolean) as object[]

      if (rows.length > 0) {
        const { error } = await supabase.from('lancamentos').insert(rows)
        if (error) totalFalhas += rows.length
        else totalImportados += rows.length
      } else {
        totalFalhas += lotes[i].length
      }
      setProgresso(Math.round(((i + 1) / lotes.length) * 100))
    }
    setImportados(totalImportados)
    setFalhas(totalFalhas)
    toast.success(`${totalImportados} registros importados!`)
  }

  return (
    <div className="space-y-4">
      <PageHeader titulo="Importar planilha" subtitulo="Importe lançamentos financeiros de arquivos .xlsx, .xls ou .csv" />

      {/* Etapa 1: upload */}
      {etapa === 'upload' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100">
              <Upload className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-center">
              <p className="font-medium">Selecione um arquivo</p>
              <p className="text-sm text-gray-400">.xlsx, .xls ou .csv</p>
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => inputRef.current?.click()}>
              Escolher arquivo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Etapa 2: mapeamento */}
      {etapa === 'mapa' && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Mapeamento de colunas ({linhas.length} linhas encontradas)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">Preview (5 primeiras linhas):</div>
            <div className="overflow-x-auto rounded border text-xs mb-4">
              <table className="min-w-full">
                <thead><tr className="bg-gray-50">{colunas.map(c => <th key={c} className="px-2 py-1 text-left">{c}</th>)}</tr></thead>
                <tbody>{linhas.slice(0, 5).map((l, i) => (
                  <tr key={i} className="border-t">{colunas.map(c => <td key={c} className="px-2 py-1 truncate max-w-[120px]">{l[c]}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>

            {([
              { label: 'Coluna de data *', field: 'data' },
              { label: 'Coluna do valor *', field: 'valor' },
              { label: 'Coluna da descrição *', field: 'descricao' },
              { label: 'Coluna do tipo (entrada/saída)', field: 'tipo' },
            ] as { label: string; field: keyof MapaColunas }[]).map(({ label, field }) => (
              <div key={field} className="space-y-1">
                <Label>{label}</Label>
                <Select value={mapa[field] as string} onValueChange={v => setMapa({ ...mapa, [field]: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— Nenhuma —</SelectItem>
                    {colunas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {!mapa.tipo && (
              <div className="space-y-1">
                <Label>Tipo fixo para todos os registros</Label>
                <Select value={mapa.tipoFixo} onValueChange={v => setMapa({ ...mapa, tipoFixo: v as 'entrada' | 'saida' | '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Conta padrão</Label>
              <Select value={mapa.conta} onValueChange={v => setMapa({ ...mapa, conta: v as 'cnpj' | 'pessoal' | 'dinheiro' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro físico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Categoria padrão (opcional)</Label>
              <Input value={mapa.categoria} onChange={e => setMapa({ ...mapa, categoria: e.target.value })} placeholder="Ex: Serviços prestados" />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEtapa('upload')}>Voltar</Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setEtapa('preview')}>Ver preview</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 3: preview final */}
      {etapa === 'preview' && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Preview final — {linhas.length} registros</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border text-xs mb-4">
              <table className="min-w-full">
                <thead><tr className="bg-gray-50">
                  <th className="px-2 py-1 text-left">Data</th>
                  <th className="px-2 py-1 text-left">Descrição</th>
                  <th className="px-2 py-1 text-left">Tipo</th>
                  <th className="px-2 py-1 text-left">Valor</th>
                </tr></thead>
                <tbody>
                  {preview().map((l, i) => {
                    const n = normalizar(l)
                    if (!n) return <tr key={i}><td colSpan={4} className="px-2 py-1 text-red-400">Linha inválida</td></tr>
                    return (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{n.data}</td>
                        <td className="px-2 py-1 truncate max-w-[180px]">{n.descricao}</td>
                        <td className="px-2 py-1 capitalize">{n.tipo}</td>
                        <td className="px-2 py-1">R$ {n.valor.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {linhas.length > 10 && <p className="text-xs text-gray-400 mb-4">... e mais {linhas.length - 10} registros</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEtapa('mapa')}>Voltar</Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={importar}>Importar {linhas.length} registros</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 4: resultado */}
      {etapa === 'done' && (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${progresso}%` }} />
            </div>
            <p className="text-sm text-gray-500">{progresso < 100 ? 'Importando...' : 'Concluído!'}</p>
            {progresso === 100 && (
              <div className="space-y-1">
                <p className="text-green-600 font-semibold">{importados} registros importados.</p>
                {falhas > 0 && <p className="text-red-500">{falhas} falharam.</p>}
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={() => { setEtapa('upload'); setLinhas([]); setColunas([]) }}>
                  Nova importação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
