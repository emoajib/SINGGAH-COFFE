// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useMemo } from 'react';
import { useOrderQueue } from '../hooks/useOrderQueue';
import { useProducts } from '../hooks/useProducts';
import { useCreateOrder, useUnpaidOrders, useCompleteOrder } from '../hooks/useOrders';
import {
    Clock,
    Coffee,
    CheckCircle2,
    RefreshCw,
    User,
    FileText,
    Sparkles,
    ChefHat,
    Trash2,
    Edit3,
    Check,
    X,
    AlertTriangle,
    Layers,
    PlusCircle,
    Receipt,
    Banknote,
    CreditCard,
    Search,
    QrCode
} from 'lucide-react';
import type { Order, Product } from '../types';

export default function BaristaQueue() {
    const { orders, isLoading, refetch, updateStatus, isUpdating, clearOldQueue, isClearing } = useOrderQueue();
    const { data: unpaidOrders = [], refetch: refetchUnpaid } = useUnpaidOrders();
    const { data: productsRaw = [] } = useProducts();
    const createOrderMutation = useCreateOrder();
    const completeOrderMutation = useCompleteOrder();

    const products: Product[] = Array.isArray(productsRaw) ? (productsRaw as unknown as Product[]) : [];

    // State untuk inline edit catatan racikan
    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
    const [editedNotes, setEditedNotes] = useState<string>('');
    const [filterTab, setFilterTab] = useState<'all' | 'queued' | 'preparing' | 'ready'>('all');

    // State untuk Modal Quick Order Barista
    const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);
    const [quickSearchProduct, setQuickSearchProduct] = useState('');
    const [quickSelectedProductId, setQuickSelectedProductId] = useState<number | null>(null);
    const [quickQuantity, setQuickQuantity] = useState<number>(1);
    const [quickCustomerName, setQuickCustomerName] = useState<string>('');
    const [quickNotes, setQuickNotes] = useState<string>('');
    const [quickPaymentMethod, setQuickPaymentMethod] = useState<'Unpaid' | 'Cash' | 'QRIS'>('Unpaid');

    // State untuk Modal Tagihan Belum Lunas (Open Bill) & Pembayaran
    const [showUnpaidModal, setShowUnpaidModal] = useState(false);
    const [selectedOrderToPay, setSelectedOrderToPay] = useState<Order | null>(null);
    const [payMethod, setPayMethod] = useState<'Cash' | 'QRIS'>('Cash');
    const [cashReceived, setCashReceived] = useState<number>(0);

    // Kategorisasi pesanan berdasarkan status dapur
    const queuedOrders = useMemo(() => orders.filter(o => o.kitchen_status === 'queued'), [orders]);
    const preparingOrders = useMemo(() => orders.filter(o => o.kitchen_status === 'preparing'), [orders]);
    const readyOrders = useMemo(() => orders.filter(o => o.kitchen_status === 'ready'), [orders]);

    // Hitung antrian lampau (> 20 jam lalu)
    const staleOrdersCount = useMemo(() => {
        const now = new Date().getTime();
        return orders.filter(o => {
            const orderTime = new Date(o.order_time).getTime();
            return (now - orderTime) > 20 * 60 * 60 * 1000;
        }).length;
    }, [orders]);

    const formatElapsedTime = (timeStr: string) => {
        if (!timeStr) return '';
        const diffSeconds = Math.max(0, Math.floor((new Date().getTime() - new Date(timeStr).getTime()) / 1000));
        const minutes = Math.floor(diffSeconds / 60);
        if (minutes < 1) return 'Baru saja';
        if (minutes < 60) return `${minutes}m lalu`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}j ${minutes % 60}m lalu`;
        const days = Math.floor(hours / 24);
        return `${days}h ${hours % 24}j lalu`;
    };

    const handleStartEdit = (order: Order) => {
        setEditingOrderId(order.id);
        setEditedNotes(order.preparation_notes || '');
    };

    const handleSaveEdit = (orderId: number, currentStatus: string) => {
        updateStatus({
            orderId,
            status: currentStatus as any,
            notes: editedNotes.trim(),
        });
        setEditingOrderId(null);
    };

    const handleCancelEdit = () => {
        setEditingOrderId(null);
        setEditedNotes('');
    };

    const handleDeleteFromQueue = (order: Order) => {
        const confirmDelete = window.confirm(`Keluarkan antrian pesanan #${order.queue_number || order.id} (${order.customer_name || 'Pelanggan'}) dari layar dapur?`);
        if (confirmDelete) {
            updateStatus({ orderId: order.id, status: 'served' });
        }
    };

    const handleClearOldOrders = () => {
        const confirmClear = window.confirm(`Apakah Anda yakin ingin membersihkan dan mengarsipkan ${staleOrdersCount > 0 ? staleOrdersCount : 'semua'} antrian lampau dari hari-hari sebelumnya?`);
        if (confirmClear) {
            clearOldQueue();
        }
    };

    const handleCreateQuickOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickSelectedProductId) {
            alert('Pilih salah satu menu kopi/minuman terlebih dahulu');
            return;
        }

        try {
            await createOrderMutation.mutateAsync({
                customer_name: quickCustomerName.trim() || 'Pelanggan Meja Bar',
                payment_method: quickPaymentMethod,
                preparation_notes: quickNotes.trim(),
                items: [
                    {
                        product_id: quickSelectedProductId,
                        quantity: quickQuantity,
                    }
                ]
            });
            setShowQuickOrderModal(false);
            setQuickSelectedProductId(null);
            setQuickQuantity(1);
            setQuickCustomerName('');
            setQuickNotes('');
            refetch();
            refetchUnpaid();
            alert('Pesanan barista berhasil dibuat dan masuk antrian peracikan!');
        } catch (err: any) {
            alert('Gagal membuat pesanan barista: ' + (err?.response?.data?.error || err.message));
        }
    };

    const handleOpenPayModal = (order: Order) => {
        setSelectedOrderToPay(order);
        setPayMethod('Cash');
        setCashReceived(order.total_amount || 0);
    };

    const handleConfirmPayment = async () => {
        if (!selectedOrderToPay) return;
        if (payMethod === 'Cash' && cashReceived < selectedOrderToPay.total_amount) {
            alert(`Uang tunai diterima (Rp ${cashReceived.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${selectedOrderToPay.total_amount.toLocaleString('id-ID')})`);
            return;
        }

        try {
            await completeOrderMutation.mutateAsync({
                id: selectedOrderToPay.id,
                payment_method: payMethod,
            });
            setSelectedOrderToPay(null);
            refetch();
            refetchUnpaid();
            alert(`Tagihan #${selectedOrderToPay.queue_number || selectedOrderToPay.id} sebesar Rp ${selectedOrderToPay.total_amount.toLocaleString('id-ID')} berhasil dilunasi via ${payMethod}!`);
        } catch (err: any) {
            alert('Gagal menyelesaikan pembayaran: ' + (err?.response?.data?.error || err.message));
        }
    };

    const renderOrderCard = (order: Order, currentColumn: 'queued' | 'preparing' | 'ready') => {
        const isEditing = editingOrderId === order.id;
        const elapsedMs = new Date().getTime() - new Date(order.order_time).getTime();
        const isUrgent = currentColumn === 'queued' && elapsedMs > 10 * 60 * 1000;
        const isStale = elapsedMs > 20 * 60 * 60 * 1000;

        return (
            <div
                key={order.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all duration-200 flex flex-col justify-between ${
                    isUrgent ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 hover:shadow-md'
                }`}
            >
                <div>
                    {/* Header Card: Nomor Antrian, Nama, dan Tombol Hapus */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl font-black px-2.5 py-1 rounded-xl bg-[#4B3621] text-amber-300 tracking-tight shadow-sm">
                                #{order.queue_number || order.id}
                            </span>
                            <div>
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{order.customer_name || 'Pelanggan'}</span>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">{order.order_number}</span>

                                {/* Status Pembayaran & Tombol Bayar Bill Cepat */}
                                <div className="flex items-center gap-1.5 mt-1">
                                    {order.payment_status === 'Paid' ? (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Lunas ({order.payment_method})
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 animate-pulse">
                                                Belum Bayar
                                            </span>
                                            <button
                                                onClick={() => handleOpenPayModal(order)}
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1 shadow-xs transition-colors"
                                                title="Selesaikan pembayaran tagihan pelanggan"
                                            >
                                                <Banknote className="w-2.5 h-2.5" /> Bayar Bill
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg ${
                                isStale ? 'bg-rose-50 text-rose-700 font-bold' : 'bg-slate-50 text-slate-500'
                            }`}>
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatElapsedTime(order.order_time)}
                            </span>
                            
                            {/* Tombol Hapus / Keluarkan dari Antrian */}
                            <button
                                onClick={() => handleDeleteFromQueue(order)}
                                disabled={isUpdating}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Keluarkan dari antrian dapur"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Catatan Racikan Khusus (Preparation Notes) & Tombol Edit */}
                    <div className="mb-3">
                        {isEditing ? (
                            <div className="p-2.5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
                                <label className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                                    Edit Catatan Racikan
                                </label>
                                <textarea
                                    value={editedNotes}
                                    onChange={(e) => setEditedNotes(e.target.value)}
                                    placeholder="Cth: Less ice, gula aren terpisah, meja 4..."
                                    rows={2}
                                    className="w-full text-xs p-2 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white text-slate-800"
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center gap-1 font-semibold"
                                    >
                                        <X className="w-3 h-3" /> Batal
                                    </button>
                                    <button
                                        onClick={() => handleSaveEdit(order.id, order.kitchen_status || currentColumn)}
                                        disabled={isUpdating}
                                        className="text-xs px-3 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold flex items-center gap-1 shadow-sm"
                                    >
                                        <Check className="w-3 h-3" /> Simpan
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                    <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800 block">Catatan Racikan:</span>
                                        <span className="font-medium">{order.preparation_notes || <em className="text-amber-600/70">Tidak ada catatan</em>}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleStartEdit(order)}
                                    className="text-amber-800 hover:text-amber-950 p-1 hover:bg-amber-100/60 rounded-md transition-colors shrink-0"
                                    title="Edit Catatan Racikan"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Daftar Item Pesanan */}
                    <div className="space-y-1.5 mb-4">
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50/80 border border-slate-100">
                                <span className="font-semibold text-slate-800 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-amber-100/80 text-amber-900 font-bold flex items-center justify-center text-[11px]">
                                        {item.quantity}x
                                    </span>
                                    {item.product?.name || 'Item'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Tombol Aksi Utama Alur Peracikan */}
                <div className="pt-2 border-t border-slate-100">
                    {currentColumn === 'queued' && (
                        <button
                            onClick={() => updateStatus({ orderId: order.id, status: 'preparing' })}
                            disabled={isUpdating}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <Coffee className="w-3.5 h-3.5" />
                            Mulai Racik
                        </button>
                    )}

                    {currentColumn === 'preparing' && (
                        <button
                            onClick={() => updateStatus({ orderId: order.id, status: 'ready' })}
                            disabled={isUpdating}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Pesanan Siap Saji
                        </button>
                    )}

                    {currentColumn === 'ready' && (
                        <button
                            onClick={() => updateStatus({ orderId: order.id, status: 'served' })}
                            disabled={isUpdating}
                            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            Selesai / Sudah Disajikan
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header KDS */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800 shadow-inner">
                        <ChefHat className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Antrian Barista (KDS)</h2>
                            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Sync (4s)
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Pantau pesanan masuk, edit catatan racikan, percepat peracikan, dan selesaikan pesanan siap saji.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Tombol Input Order Cepat Barista */}
                    <button
                        onClick={() => setShowQuickOrderModal(true)}
                        className="bg-[#4B3621] hover:bg-[#382818] text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                        title="Input pesanan langsung dari stasiun barista"
                    >
                        <PlusCircle className="w-4 h-4 text-amber-300" />
                        <span>+ Order Cepat</span>
                    </button>

                    {/* Tombol Daftar Tagihan Belum Lunas (Open Bill) */}
                    <button
                        onClick={() => setShowUnpaidModal(true)}
                        className={`font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 border transition-all active:scale-95 ${
                            unpaidOrders.length > 0
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                        title="Lihat tagihan pelanggan yang belum lunas"
                    >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Open Bill ({unpaidOrders.length})</span>
                    </button>

                    {/* Tombol Pembersih Antrian Lampau */}
                    {staleOrdersCount > 0 && (
                        <button
                            onClick={handleClearOldOrders}
                            disabled={isClearing}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                            title="Arsipkan semua antrian lampau dari hari-hari sebelumnya"
                        >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>{isClearing ? 'Membersihkan...' : `Bersihkan ${staleOrdersCount} Antrian Lampau`}</span>
                        </button>
                    )}

                    {/* Tombol Selesaikan Semua Pesanan Aktif */}
                    {orders.length > 0 && (
                        <button
                            onClick={() => {
                                const confirmAll = window.confirm(`Tandai semua ${orders.length} pesanan yang aktif menjadi selesai / sudah disajikan?`);
                                if (confirmAll) {
                                    clearOldQueue();
                                }
                            }}
                            disabled={isClearing}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors active:scale-95"
                            title="Tandai semua pesanan sudah disajikan ke pelanggan"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{isClearing ? 'Memproses...' : `Selesaikan Semua (${orders.length})`}</span>
                        </button>
                    )}

                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-semibold">
                        <span className="px-3 py-1.5 rounded-xl bg-white text-slate-800 shadow-sm">
                            Total Aktif: <strong className="text-amber-800">{orders.length}</strong>
                        </span>
                    </div>

                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-sm"
                        title="Segarkan Antrian"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filter Tab untuk Layar Tablet / Ponsel */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setFilterTab('all')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        filterTab === 'all'
                            ? 'bg-[#4B3621] text-amber-300 shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Semua Kolom ({orders.length})
                </button>
                <button
                    onClick={() => setFilterTab('queued')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        filterTab === 'queued'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    Menunggu ({queuedOrders.length})
                </button>
                <button
                    onClick={() => setFilterTab('preparing')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        filterTab === 'preparing'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Coffee className="w-3.5 h-3.5" />
                    Sedang Diracik ({preparingOrders.length})
                </button>
                <button
                    onClick={() => setFilterTab('ready')}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                        filterTab === 'ready'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    Siap Saji ({readyOrders.length})
                </button>
            </div>

            {/* 3 Kolom Kanban Antrian */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Kolom 1: Menunggu / Queued */}
                {(filterTab === 'all' || filterTab === 'queued') && (
                    <div className="bg-slate-50/70 border border-slate-200 rounded-3xl p-4 flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                <h3 className="font-bold text-sm text-slate-800">Menunggu Diracik</h3>
                            </div>
                            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                {queuedOrders.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                            {queuedOrders.length === 0 ? (
                                <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                                    <Clock className="w-8 h-8 stroke-1 mb-2 opacity-40" />
                                    <p className="text-xs font-medium">Tidak ada antrian baru</p>
                                </div>
                            ) : (
                                queuedOrders.map(order => renderOrderCard(order, 'queued'))
                            )}
                        </div>
                    </div>
                )}

                {/* Kolom 2: Sedang Diracik / Preparing */}
                {(filterTab === 'all' || filterTab === 'preparing') && (
                    <div className="bg-amber-50/30 border border-amber-200/80 rounded-3xl p-4 flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                                <h3 className="font-bold text-sm text-slate-800">Sedang Diracik</h3>
                            </div>
                            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                {preparingOrders.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                            {preparingOrders.length === 0 ? (
                                <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                                    <Coffee className="w-8 h-8 stroke-1 mb-2 opacity-40" />
                                    <p className="text-xs font-medium">Belum ada yang sedang diracik</p>
                                </div>
                            ) : (
                                preparingOrders.map(order => renderOrderCard(order, 'preparing'))
                            )}
                        </div>
                    </div>
                )}

                {/* Kolom 3: Siap Disajikan / Ready */}
                {(filterTab === 'all' || filterTab === 'ready') && (
                    <div className="bg-emerald-50/30 border border-emerald-200/80 rounded-3xl p-4 flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <h3 className="font-bold text-sm text-slate-800">Siap Disajikan</h3>
                            </div>
                            <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {readyOrders.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                            {readyOrders.length === 0 ? (
                                <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                                    <CheckCircle2 className="w-8 h-8 stroke-1 mb-2 opacity-40 text-emerald-500" />
                                    <p className="text-xs font-medium">Semua minuman telah disajikan</p>
                                </div>
                            ) : (
                                readyOrders.map(order => renderOrderCard(order, 'ready'))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Quick Order Barista */}
            {showQuickOrderModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowQuickOrderModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                                <PlusCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Input Order Cepat Barista</h3>
                                <p className="text-xs text-slate-500">Buat pesanan langsung dari meja bar tanpa perlu ke kasir</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateQuickOrder} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Nama Pemesan / Meja</label>
                                    <input
                                        type="text"
                                        value={quickCustomerName}
                                        onChange={(e) => setQuickCustomerName(e.target.value)}
                                        placeholder="Cth: Meja 3 / Kak Rian"
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Metode Pembayaran</label>
                                    <select
                                        value={quickPaymentMethod}
                                        onChange={(e) => setQuickPaymentMethod(e.target.value as any)}
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white"
                                    >
                                        <option value="Unpaid">🕒 Bayar Nanti (Open Bill)</option>
                                        <option value="Cash">💵 Sudah Bayar Tunai (Cash)</option>
                                        <option value="QRIS">📱 Sudah Bayar QRIS</option>
                                    </select>
                                </div>
                            </div>

                            {/* Pilih Menu Kopi / Minuman */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Pilih Menu Minuman</label>
                                <div className="relative mb-2">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        value={quickSearchProduct}
                                        onChange={(e) => setQuickSearchProduct(e.target.value)}
                                        placeholder="Cari menu (Kopsu, Americano, dll)..."
                                        className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-700 bg-slate-50"
                                    />
                                </div>
                                <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                                    {products
                                        .filter(p => !quickSearchProduct || p.name.toLowerCase().includes(quickSearchProduct.toLowerCase()))
                                        .map(product => {
                                            const isSelected = quickSelectedProductId === product.id;
                                            return (
                                                <button
                                                    type="button"
                                                    key={product.id}
                                                    onClick={() => setQuickSelectedProductId(product.id)}
                                                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-all ${
                                                        isSelected
                                                            ? 'bg-[#4B3621] text-amber-300 font-bold shadow-sm'
                                                            : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-100'
                                                    }`}
                                                >
                                                    <span className="truncate pr-2">{product.name}</span>
                                                    <span className="shrink-0 font-mono text-[11px]">Rp {product.price?.toLocaleString('id-ID')}</span>
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Kuantitas & Catatan Racikan */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Jumlah (Qty)</label>
                                    <div className="flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setQuickQuantity(Math.max(1, quickQuantity - 1))}
                                            className="px-2.5 py-2 rounded-l-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-xs font-bold"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min={1}
                                            value={quickQuantity}
                                            onChange={(e) => setQuickQuantity(Math.max(1, Number(e.target.value)))}
                                            className="w-full text-center text-xs py-2 border-y border-slate-300 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setQuickQuantity(quickQuantity + 1)}
                                            className="px-2.5 py-2 rounded-r-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-xs font-bold"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Racikan Barista</label>
                                    <input
                                        type="text"
                                        value={quickNotes}
                                        onChange={(e) => setQuickNotes(e.target.value)}
                                        placeholder="Cth: Less sugar, extra ice, mug keramik"
                                        className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={createOrderMutation.isPending}
                                className="w-full bg-[#4B3621] hover:bg-[#382818] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 mt-2"
                            >
                                {createOrderMutation.isPending ? 'Mengirim ke Antrian...' : 'Kirim Langsung ke Antrian Barista'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Tagihan Belum Lunas (Open Bill) */}
            {showUnpaidModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100 max-h-[90vh] flex flex-col">
                        <button
                            onClick={() => setShowUnpaidModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Daftar Tagihan Belum Lunas (Open Bills)</h3>
                                <p className="text-xs text-slate-500">Pesanan aktif yang sedang/sudah disajikan dan menunggu pembayaran</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                            {unpaidOrders.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                                    <p className="text-xs font-bold text-slate-600">Semua Tagihan Sudah Lunas!</p>
                                    <p className="text-[11px] text-slate-400 mt-1">Tidak ada pesanan yang berstatus open bill saat ini.</p>
                                </div>
                            ) : (
                                unpaidOrders.map(order => (
                                    <div
                                        key={order.id}
                                        className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-amber-400 transition-colors"
                                    >
                                        <div>
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-[#4B3621] text-amber-300">
                                                    {order.queue_number && order.queue_number > 0 ? `#${order.queue_number}` : `ID #${order.id}`}
                                                </span>
                                                {order.order_source === 'self_order' && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
                                                        <QrCode className="w-3 h-3" /> QR Mandiri
                                                    </span>
                                                )}
                                                {order.pickup_code && (
                                                    <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                                        Kode: {order.pickup_code}
                                                    </span>
                                                )}
                                                <span className="font-bold text-xs text-slate-800">{order.customer_name || 'Pelanggan'}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">({order.order_number})</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    order.kitchen_status === 'waiting_payment'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : order.kitchen_status === 'served'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {order.kitchen_status === 'waiting_payment'
                                                        ? '⏳ Menunggu Pembayaran'
                                                        : order.kitchen_status === 'served'
                                                        ? '✓ Sudah Disajikan'
                                                        : 'Sedang Diproses'}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-600 space-y-0.5">
                                                {order.items?.map((it, idx) => (
                                                    <span key={idx} className="mr-2 inline-block">
                                                        {it.quantity}x {it.product?.name || 'Item'}
                                                    </span>
                                                ))}
                                            </div>
                                            {order.preparation_notes && (
                                                <p className="text-[11px] text-amber-800 italic mt-0.5">Catatan: {order.preparation_notes}</p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Tagihan</span>
                                                <span className="text-sm font-black text-amber-900">
                                                    Rp {(order.total_amount || 0).toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setShowUnpaidModal(false);
                                                    handleOpenPayModal(order);
                                                }}
                                                className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                            >
                                                <Banknote className="w-3.5 h-3.5" />
                                                Bayar Bill
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Selesaikan Pembayaran Bill (Cash / QRIS) */}
            {selectedOrderToPay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100">
                        <button
                            onClick={() => setSelectedOrderToPay(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-base font-extrabold text-slate-900 mb-1">
                            Pelunasan Tagihan #{selectedOrderToPay.queue_number || selectedOrderToPay.id}
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Pelanggan: <strong className="text-slate-800">{selectedOrderToPay.customer_name || 'Pelanggan'}</strong> ({selectedOrderToPay.order_number})
                        </p>

                        {/* Rincian Tagihan */}
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-4 space-y-1.5 text-xs">
                            <div className="flex justify-between font-bold text-slate-700 pb-1 border-b border-slate-200">
                                <span>Rincian Menu</span>
                                <span>Subtotal</span>
                            </div>
                            {selectedOrderToPay.items?.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-slate-600">
                                    <span>{it.quantity}x {it.product?.name || 'Item'}</span>
                                    <span className="font-mono">Rp {(it.price * it.quantity).toLocaleString('id-ID')}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                                <span className="font-black text-slate-700">Total Tagihan</span>
                                <span className="text-lg font-black text-amber-900">
                                    Rp {(selectedOrderToPay.total_amount || 0).toLocaleString('id-ID')}
                                </span>
                            </div>
                        </div>

                        {/* Pilihan Metode Bayar */}
                        <div className="space-y-3 mb-4">
                            <label className="text-xs font-bold text-slate-700 block">Pilih Metode Pembayaran:</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('Cash')}
                                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        payMethod === 'Cash'
                                            ? 'bg-amber-800 text-white border-amber-900 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <Banknote className="w-4 h-4" />
                                    Tunai (Cash)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayMethod('QRIS')}
                                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                        payMethod === 'QRIS'
                                            ? 'bg-amber-800 text-white border-amber-900 shadow-sm'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <CreditCard className="w-4 h-4" />
                                    QRIS
                                </button>
                            </div>

                            {/* Input Uang Diterima jika Tunai */}
                            {payMethod === 'Cash' && (
                                <div className="space-y-2 pt-2">
                                    <label className="text-xs font-bold text-slate-700 block">Nominal Uang Diterima (Rp):</label>
                                    <input
                                        type="number"
                                        value={cashReceived || ''}
                                        onChange={(e) => setCashReceived(Number(e.target.value))}
                                        className="w-full text-sm font-bold p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700 font-mono"
                                    />
                                    {/* Tombol Cepat Nominal */}
                                    <div className="flex gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setCashReceived(selectedOrderToPay.total_amount || 0)}
                                            className="flex-1 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700"
                                        >
                                            Uang Pas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCashReceived(50000)}
                                            className="flex-1 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700"
                                        >
                                            50.000
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCashReceived(100000)}
                                            className="flex-1 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700"
                                        >
                                            100.000
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-center text-xs pt-1">
                                        <span className="text-slate-500 font-bold">Kembalian:</span>
                                        <span className={`font-mono font-bold ${
                                            cashReceived >= (selectedOrderToPay.total_amount || 0)
                                                ? 'text-emerald-700'
                                                : 'text-rose-600'
                                        }`}>
                                            Rp {Math.max(0, cashReceived - (selectedOrderToPay.total_amount || 0)).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={completeOrderMutation.isPending}
                            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                            {completeOrderMutation.isPending ? 'Memproses Pelunasan...' : '✓ Konfirmasi Lunas & Tutup Tagihan'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
