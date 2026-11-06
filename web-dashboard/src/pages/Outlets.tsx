import { useEffect, useState } from 'react'
import { OutletsService } from '../services/outletsService'
import type { Outlet } from '../types/index'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export default function Outlets() {
  const [items, setItems] = useState<Outlet[]>([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [editing, setEditing] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setItems(await OutletsService.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const reset = () => { setName(''); setAddress(''); setPhone(''); setCode(''); setEditing(null) }

  const submit = async () => {
    const payload = { name, address, phone, code }
    if (editing) await OutletsService.update(editing, payload)
    else await OutletsService.create(payload)
    reset()
    await load()
  }

  const edit = (o: Outlet) => {
    setEditing(o.id)
    setName(o.name || '')
    setAddress(o.address || '')
    setPhone(o.phone || '')
    setCode(o.code || '')
  }

  const remove = async (id: number) => {
    if (!confirm('Hapus outlet ini?')) return
    await OutletsService.remove(id)
    await load()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Manajemen Outlet</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <Input placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Alamat" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input placeholder="Telepon" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input placeholder="Kode" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button onClick={submit}>{editing ? 'Simpan' : 'Tambah'}</Button>
      </div>
      {editing && <Button variant="outline" onClick={reset}>Batal</Button>}
      {loading ? <p>Memuat...</p> : (
        <table className="w-full text-sm border">
          <thead><tr><th className="p-2 text-left">Nama</th><th className="p-2 text-left">Alamat</th><th className="p-2 text-left">Telepon</th><th className="p-2 text-left">Kode</th><th className="p-2">Aksi</th></tr></thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-2">{o.name}</td>
                <td className="p-2">{o.address}</td>
                <td className="p-2">{o.phone}</td>
                <td className="p-2">{o.code}</td>
                <td className="p-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(o)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(o.id)}>Hapus</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}