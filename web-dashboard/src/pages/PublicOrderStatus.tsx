// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Coffee,
  CheckCircle2,
  Clock,
  ShoppingBag,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Check,
  PartyPopper
} from 'lucide-react';
import { publicOrderService } from '../services/publicOrderService';
import type { PublicOrderStatusResponse } from '../types';
import { formatCurrency } from '../lib/utils';

export default function PublicOrderStatus() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<PublicOrderStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async (isManual = false) => {
    if (!token) return;
    try {
      if (isManual) setIsRefreshing(true);
      const data = await publicOrderService.trackOrder(token);
      setOrder(data);
      setLastUpdated(new Date());
      setErrorMsg(null);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setErrorMsg('Pesanan tidak ditemukan atau token tidak valid.');
      } else {
        setErrorMsg('Gagal menyinkronkan status pesanan.');
      }
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Adaptive polling: 8 seconds while order is actively progressing
    const intervalMs = 8000;
    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, intervalMs);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [token]);

  // Adjust polling if order reached ready or served
  useEffect(() => {
    if (!order) return;
    if (order.kitchen_status === 'served') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [order?.kitchen_status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4 animate-spin">
          <RefreshCw className="w-7 h-7 text-[#4B3621]" />
        </div>
        <h2 className="text-base font-black text-[#4B3621]">Melacak Status Pesanan...</h2>
        <p className="text-xs text-amber-800/70 mt-1">Menghubungkan ke sistem Singgah Coffee</p>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-800">Tiket Tidak Ditemukan</h2>
        <p className="text-xs text-slate-600 mt-2 max-w-sm">{errorMsg || 'Pesanan tidak ditemukan.'}</p>
        <button
          onClick={() => navigate('/order')}
          className="mt-6 px-5 py-2.5 bg-[#4B3621] text-amber-300 rounded-xl font-bold text-xs shadow-md"
        >
          Kembali ke Buku Menu
        </button>
      </div>
    );
  }

  const isPaid = order.payment_status === 'Paid';
  const isWaitingPayment = order.kitchen_status === 'waiting_payment' || !isPaid;
  const isQueued = isPaid && order.kitchen_status === 'queued';
  const isPreparing = order.kitchen_status === 'preparing';
  const isReady = order.kitchen_status === 'ready';
  const isServed = order.kitchen_status === 'served';

  // Step active index: 1 = unpay, 2 = queued, 3 = preparing, 4 = ready/served
  const currentStep = isWaitingPayment ? 1 : isQueued ? 2 : isPreparing ? 3 : 4;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-800 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-amber-900/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/order')}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 p-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>

          <span className="text-xs font-black tracking-tight text-[#4B3621]">Tiket Antrean Digital</span>

          <button
            onClick={() => fetchStatus(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-full hover:bg-amber-100 text-amber-900 transition-colors"
            title="Perbarui Status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Main Status Ticket Card */}
        <div className="bg-white rounded-3xl p-6 border border-amber-900/10 shadow-xl relative overflow-hidden text-center">
          {/* Subtle background decoration */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl"></div>

          {/* Customer Greeting */}
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            Pesanan atas nama
          </p>
          <h2 className="text-xl font-black text-slate-900 mt-0.5">{order.customer_name}</h2>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{order.order_number}</p>

          {/* Prominent Verification / Queue Display */}
          <div className="my-5 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/80 shadow-inner">
            {isWaitingPayment ? (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                  Tunjukkan Kode Ini ke Kasir
                </span>
                <div className="text-4xl font-black font-mono tracking-widest text-[#4B3621] py-1 select-all">
                  {order.pickup_code}
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/60 text-amber-950 text-[11px] font-bold">
                  <Clock className="w-3.5 h-3.5" /> Menunggu Pembayaran Kasir
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                  Nomor Antrean Resmi Anda
                </span>
                <div className="text-5xl font-black text-[#4B3621] py-1">
                  #{order.queue_number || order.pickup_code}
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sudah Lunas ({order.payment_status})
                </div>
              </div>
            )}
          </div>

          {/* Current Barista Status Highlight */}
          <div className="p-4 rounded-2xl bg-[#4B3621] text-white shadow-md">
            {isWaitingPayment && (
              <div>
                <h4 className="text-sm font-extrabold text-amber-300">Silakan Bayar di Kasir</h4>
                <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                  Pesananmu sudah tersimpan di sistem kasir. Begitu pembayaran lunas, barista akan langsung meracik minumanmu!
                </p>
              </div>
            )}

            {isQueued && (
              <div>
                <h4 className="text-sm font-extrabold text-amber-300">Menunggu Antrean Racik</h4>
                <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                  Pembayaran diterima! Pesananmu kini berada di antrean barista Singgah Coffee.
                </p>
              </div>
            )}

            {isPreparing && (
              <div>
                <div className="flex items-center justify-center gap-2 text-amber-300 mb-1">
                  <Coffee className="w-5 h-5 animate-pulse" />
                  <h4 className="text-sm font-extrabold">Barista Sedang Meracik</h4>
                </div>
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  Biji kopi sedang digiling & diekstraksi dengan teliti. Mohon ditunggu ya!
                </p>
              </div>
            )}

            {isReady && (
              <div className="animate-pulse">
                <div className="flex items-center justify-center gap-2 text-emerald-300 mb-1">
                  <PartyPopper className="w-5 h-5" />
                  <h4 className="text-sm font-extrabold text-emerald-300">Pesanan Siap Diambil!</h4>
                </div>
                <p className="text-xs text-amber-100 leading-relaxed">
                  Silakan ambil pesananmu di bar penyerahan dengan menyebutkan nama <strong>{order.customer_name}</strong>.
                </p>
              </div>
            )}

            {isServed && (
              <div>
                <h4 className="text-sm font-extrabold text-emerald-300">Pesanan Selesai Disajikan</h4>
                <p className="text-xs text-amber-100/90 mt-1 leading-relaxed">
                  Selamat menikmati! Terima kasih telah berkunjung ke Singgah Coffee.
                </p>
              </div>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between relative">
              {/* Line background */}
              <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
              <div
                className="absolute top-1/2 left-4 h-0.5 bg-[#4B3621] -translate-y-1/2 z-0 transition-all duration-500"
                style={{
                  width: `${((currentStep - 1) / 3) * 100}%`,
                }}
              ></div>

              {/* Steps */}
              {[
                { label: 'Bayar', step: 1 },
                { label: 'Antre', step: 2 },
                { label: 'Dirack', step: 3 },
                { label: 'Siap', step: 4 },
              ].map((s) => {
                const isPassed = currentStep >= s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <div key={s.step} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        isCurrent
                          ? 'bg-[#4B3621] text-amber-300 ring-4 ring-amber-100 scale-110 shadow-md'
                          : isPassed
                          ? 'bg-[#4B3621] text-amber-300'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPassed && !isCurrent ? <Check className="w-3.5 h-3.5" /> : s.step}
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-bold ${
                        isCurrent ? 'text-[#4B3621]' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Order Items Breakdown */}
        <div className="bg-white rounded-3xl p-5 border border-amber-900/10 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Rincian Menu Pesanan
            </h3>
            <span className="text-xs font-bold text-amber-900">
              {order.items.reduce((s, it) => s + it.quantity, 0)} Item
            </span>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#4B3621]">
                      {item.quantity}x
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {item.product_name}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[10px] text-amber-800 italic mt-0.5 ml-5">
                      Catatan: {item.notes}
                    </p>
                  )}
                </div>

                <span className="text-xs font-black text-slate-800 shrink-0">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Total Tagihan</span>
            <span className="text-sm font-black text-[#4B3621]">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => navigate('/order')}
            className="w-full py-3 bg-white hover:bg-amber-50 text-slate-800 font-bold text-xs rounded-2xl border border-amber-900/10 shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4 text-[#4B3621]" />
            <span>Pesan Menu Lain / Tambah Pesanan</span>
          </button>

          <p className="text-[10px] text-center text-slate-400">
            Halaman ini diperbarui otomatis setiap beberapa detik &middot; Terakhir diperbarui{' '}
            {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </main>
    </div>
  );
}
