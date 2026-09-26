// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useMemo } from 'react';
import { useOrderQueue } from '../hooks/useOrderQueue';
import { Clock, Coffee, CheckCircle2, RefreshCw, User, FileText, Sparkles, ChefHat } from 'lucide-react';
import type { Order } from '../types';

export default function BaristaQueue() {
    const { orders, isLoading, refetch, updateStatus, isUpdating } = useOrderQueue();

    // Kategorisasi pesanan berdasarkan status dapur
    const queuedOrders = useMemo(() => orders.filter(o => o.kitchen_status === 'queued'), [orders]);
    const preparingOrders = useMemo(() => orders.filter(o => o.kitchen_status === 'preparing'), [orders]);
    const readyOrders = useMemo(() => orders.filter(o => o.kitchen_status === 'ready'), [orders]);

    const formatElapsedTime = (timeStr: string) => {
        if (!timeStr) return '';
        const diffSeconds = Math.max(0, Math.floor((new Date().getTime() - new Date(timeStr).getTime()) / 1000));
        const minutes = Math.floor(diffSeconds / 60);
        if (minutes < 1) return 'Baru saja';
        if (minutes < 60) return `${minutes}m lalu`;
        const hours = Math.floor(minutes / 60);
        return `${hours}j ${minutes % 60}m lalu`;
    };

    const renderOrderCard = (order: Order, currentColumn: 'queued' | 'preparing' | 'ready') => {
        const isUrgent = currentColumn === 'queued' && (new Date().getTime() - new Date(order.order_time).getTime()) > 10 * 60 * 1000;

        return (
            <div
                key={order.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all duration-200 flex flex-col justify-between ${
                    isUrgent ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 hover:shadow-md'
                }`}
            >
                {/* Header Card: Nomor Antrian & Waktu */}
                <div>
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

                        <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formatElapsedTime(order.order_time)}
                            </span>
                        </div>
                    </div>

                    {/* Catatan Racikan Khusus (Preparation Notes) */}
                    {order.preparation_notes && (
                        <div className="mb-3 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800 block">Catatan Racikan:</span>
                                <span className="font-medium">{order.preparation_notes}</span>
                            </div>
                        </div>
                    )}

                    {/* Daftar Item Pesanan */}
                    <div className="space-y-1.5 mb-4">
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50/70">
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

                {/* Footer Tombol Aksi Transisi Status */}
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
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Pesanan Siap
                        </button>
                    )}

                    {currentColumn === 'ready' && (
                        <button
                            onClick={() => updateStatus({ orderId: order.id, status: 'served' })}
                            disabled={isUpdating}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Selesai / Disajikan
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header KDS */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                            Pantau pesanan masuk, percepat peracikan minuman, dan tandai pesanan siap saji.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
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

            {/* 3 Kolom Kanban Antrian */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Kolom 1: Menunggu / Queued */}
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

                {/* Kolom 2: Sedang Diracik / Preparing */}
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

                {/* Kolom 3: Siap Disajikan / Ready */}
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
            </div>
        </div>
    );
}
