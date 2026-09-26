// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useMemo } from 'react';
import { useOrderQueue } from '../hooks/useOrderQueue';
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
    Layers
} from 'lucide-react';
import type { Order } from '../types';

export default function BaristaQueue() {
    const { orders, isLoading, refetch, updateStatus, isUpdating, clearOldQueue, isClearing } = useOrderQueue();

    // State untuk inline edit catatan racikan
    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
    const [editedNotes, setEditedNotes] = useState<string>('');
    const [filterTab, setFilterTab] = useState<'all' | 'queued' | 'preparing' | 'ready'>('all');

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
        </div>
    );
}
