import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Dialog } from "../components/ui/dialog"
import { Search, Calendar, Filter, Printer, Eye, Loader2, Trash2 } from "lucide-react"
import { useOrders, useVoidOrder } from "../hooks/useOrders"
import { useToast } from "../hooks/use-toast"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import { formatNumber } from "../lib/utils"

export default function Sales() {
    const { user } = useSelector((state: RootState) => state.auth)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedTx, setSelectedTx] = useState<any | null>(null)
    const { toast } = useToast()

    const { data: orders = [], isLoading: loading, refetch } = useOrders()
    const voidOrder = useVoidOrder()

    const handleVoid = async (id: number) => {
        if (!window.confirm("Are you sure you want to void this transaction? This cannot be undone.")) return
        try {
            await voidOrder.mutateAsync(id)
            toast({ title: "Success", description: "Transaction voided successfully", variant: "success" })
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.error || "Failed to void transaction", variant: "error" })
        }
    }

    const formatCurrency = (value: number) => {
        return `Rp ${formatNumber(value)}`
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return {
            date: date.toLocaleDateString('id-ID'),
            time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
    }

    const filteredOrders = orders.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Penjualan & Transaksi</h1>
                    <p className="text-gray-500">Pantau semua pembayaran yang berhasil dan tertunda.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => refetch()}>
                        <Calendar className="w-4 h-4" /> Segarkan
                    </Button>
                    <Button variant="secondary" className="gap-2 text-primary border-primary">
                        <Filter className="w-4 h-4" /> Hari Ini
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Riwayat Transaksi</CardTitle>
                            <CardDescription>Sinkronisasi pesanan waktu nyata.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari no. pesanan..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b">
                                    <tr>
                                        <th className="px-6 py-3">No. Pesanan</th>
                                        <th className="px-6 py-3">Waktu</th>
                                        <th className="px-6 py-3">Kasir</th>
                                        <th className="px-6 py-3">Jumlah</th>
                                        <th className="px-6 py-3">Pembayaran</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => {
                                        const dt = formatDate(order.created_at)
                                        return (
                                            <tr key={order.ID} className="bg-white border-b hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-primary">{order.order_number}</td>
                                                <td className="px-6 py-4">
                                                    <div>{dt.time}</div>
                                                    <div className="text-[10px] text-gray-400">{dt.date}</div>
                                                </td>
                                                <td className="px-6 py-4">{order.cashier_name}</td>
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    {formatCurrency(order.total_amount)}
                                                </td>
                                                <td className="px-6 py-4 uppercase text-xs">{order.payment_method}</td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={order.status === 'Completed' ? 'success' : 'warning'}>
                                                        {order.status === 'Completed' ? 'Selesai' : order.status === 'Void' ? 'Dibatalkan' : 'Pending'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-primary"
                                                        onClick={() => setSelectedTx(order)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {user?.role === 'owner' && (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-50 cursor-not-allowed" title="Driver thermal coming soon">
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {order.status !== 'Void' && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                            onClick={() => handleVoid(order.ID)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {filteredOrders.length === 0 && (
                                <div className="text-center py-12 text-gray-400">Tidak ada transaksi ditemukan.</div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Receipt Modal */}
            <Dialog
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                title="Detail E-Struk"
                description={`Identifikasi Pesanan: ${selectedTx?.order_number}`}
                footer={
                    <>
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedTx(null)}>Tutup</Button>
                        {user?.role === 'owner' && (
                            <Button variant="default" className="w-full sm:w-auto gap-2 opacity-50 cursor-not-allowed">
                                <Printer className="w-4 h-4" /> Cetak Struk Fisik
                            </Button>
                        )}
                    </>
                }
            >
                {selectedTx && (
                    <div className="space-y-4 font-mono text-sm bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                        <div className="text-center border-b border-dashed border-gray-300 pb-4">
                            <h3 className="font-bold text-xl uppercase tracking-wider">Singgah Coffee</h3>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">Catatan Transaksi Resmi</p>
                        </div>

                        <div className="grid grid-cols-2 gap-y-1 text-[10px] text-gray-500 py-2">
                            <span>ID Pesanan:</span> <span className="text-right text-gray-900">{selectedTx.order_number}</span>
                            <span>Tanggal:</span> <span className="text-right text-gray-900">{formatDate(selectedTx.created_at).date}</span>
                            <span>Kasir:</span> <span className="text-right text-gray-900">{selectedTx.cashier_name}</span>
                            <span>Pembayaran:</span> <span className="text-right text-gray-900 uppercase">{selectedTx.payment_method}</span>
                        </div>

                        <div className="border-t border-b border-dashed border-gray-300 py-4 space-y-3">
                            {selectedTx.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-start text-xs">
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800">{item.product?.name || 'Produk Tidak Dikenal'}</div>
                                        <div className="text-[10px] text-gray-400">{item.quantity} x {formatCurrency(item.price)}</div>
                                    </div>
                                    <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 space-y-1">
                            <div className="flex justify-between font-black text-lg text-primary pt-2">
                                <span>TOTAL DIBAYAR</span>
                                <span>{formatCurrency(selectedTx.total_amount)}</span>
                            </div>
                        </div>

                        <div className="text-center text-[9px] text-gray-400 pt-6 italic">
                            *** Terima kasih telah memilih Singgah Coffee ***<br />
                            Simpan struk Anda untuk keperluan pertanyaan atau klaim.
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    )
}
