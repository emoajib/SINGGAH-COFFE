// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicLoyaltyCard, useLoyaltyMutations } from '../hooks/useLoyalty';
import { Coffee, Star, MessageSquare, Send, CheckCircle2, Gift, Sparkles, Award } from 'lucide-react';

export default function LoyaltyPublicPage() {
    const { token } = useParams<{ token: string }>();
    const { data: card, isLoading, isError } = usePublicLoyaltyCard(token || '');
    const { submitFeedback } = useLoyaltyMutations();

    const [rating, setRating] = useState<number>(5);
    const [category, setCategory] = useState<string>('pelayanan');
    const [message, setMessage] = useState<string>('');
    const [submitted, setSubmitted] = useState<boolean>(false);

    const handleSubmitFeedback = (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !message.trim()) return;

        submitFeedback.mutate(
            { token, payload: { rating, category, message: message.trim() } },
            {
                onSuccess: () => {
                    setSubmitted(true);
                    setMessage('');
                }
            }
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F5F0E6] flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-[#4B3621] text-amber-300 flex items-center justify-center animate-bounce mb-3 shadow-lg">
                    <Coffee className="w-6 h-6" />
                </div>
                <p className="font-bold text-[#4B3621] text-sm animate-pulse">Memuat Kartu Loyalitas...</p>
            </div>
        );
    }

    if (isError || !card) {
        return (
            <div className="min-h-screen bg-[#F5F0E6] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                    <Coffee className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-black text-slate-800">Kartu Tidak Ditemukan</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Pastikan tautan QR yang Anda pindai dari struk pembelian sudah sesuai.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F0E6] text-slate-800 pb-12 font-sans">
            {/* Header Brand */}
            <div className="bg-[#4B3621] text-white pt-8 pb-14 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-amber-600/20 rounded-full blur-2xl pointer-events-none" />
                <div className="max-w-md mx-auto text-center relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <Coffee className="w-6 h-6 text-amber-300" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-amber-100">{card.outlet_name}</h1>
                    <p className="text-xs text-amber-200/80 mt-0.5 font-medium">Kartu Stempel Digital Pelanggan</p>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 -mt-8 space-y-6">
                {/* Kartu Profil Member */}
                <div className="bg-white rounded-3xl p-5 shadow-xl border border-amber-900/10 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-1">
                            {card.tier} Member
                        </span>
                        <h2 className="text-lg font-black text-slate-900 leading-tight">{card.customer_name}</h2>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{card.phone_masked}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block">Total Kunjungan</span>
                        <span className="text-2xl font-black text-[#4B3621]">{card.total_orders}x</span>
                    </div>
                </div>

                {/* Kartu Program Stempel */}
                {card.programs?.map((prog) => {
                    const totalCups = prog.threshold_value || 10;
                    const filledCups = Math.min(prog.current_stamps, totalCups);

                    return (
                        <div key={prog.program_id} className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-black text-base text-slate-900">{prog.program_name}</h3>
                                    <p className="text-xs text-amber-800 font-semibold flex items-center gap-1 mt-0.5">
                                        <Gift className="w-3.5 h-3.5 text-amber-600" />
                                        {prog.reward_note || 'Hadiah Spesial'}
                                    </p>
                                </div>
                                <span className="text-xs font-black px-3 py-1 bg-amber-50 text-amber-900 rounded-full border border-amber-200">
                                    {prog.current_stamps}/{totalCups} Stempel
                                </span>
                            </div>

                            {/* Grid Lingkaran Stempel Kopi */}
                            <div className="grid grid-cols-5 gap-2.5 pt-2">
                                {Array.from({ length: totalCups }).map((_, idx) => {
                                    const isFilled = idx < filledCups;
                                    const isLast = idx === totalCups - 1;

                                    return (
                                        <div
                                            key={idx}
                                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                                                isFilled
                                                    ? 'bg-[#4B3621] text-amber-300 shadow-md scale-100'
                                                    : 'bg-slate-50 border-2 border-dashed border-slate-200 text-slate-300'
                                            }`}
                                        >
                                            {isLast ? (
                                                <Award className={`w-5 h-5 ${isFilled ? 'text-amber-300' : 'text-slate-300'}`} />
                                            ) : (
                                                <Coffee className={`w-5 h-5 ${isFilled ? 'text-amber-300 fill-amber-300/40' : 'text-slate-300'}`} />
                                            )}
                                            <span className="text-[9px] font-bold mt-0.5">{idx + 1}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Status Reward */}
                            {prog.is_eligible ? (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-center gap-2 font-bold animate-pulse">
                                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Selamat! Stempel Anda sudah penuh. Tunjukkan kartu ini ke kasir untuk menukar reward!</span>
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-500 text-center font-medium">
                                    Kumpulkan {totalCups - filledCups} stempel lagi untuk klaim reward minuman / hadiah Anda!
                                </p>
                            )}
                        </div>
                    );
                })}

                {/* Formulir Kritik & Saran (Feedback) */}
                <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-amber-700" />
                        <h3 className="font-bold text-slate-900 text-sm">Kritik, Saran & Masukan</h3>
                    </div>
                    <p className="text-xs text-slate-500">
                        Bantu kami meningkatkan kualitas racikan dan pelayanan Singgah Coffee.
                    </p>

                    {submitted ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                            <h4 className="font-bold text-sm text-emerald-900">Masukan Berhasil Terkirim!</h4>
                            <p className="text-xs text-emerald-700">Terima kasih atas apresiasi dan saran berharga Anda.</p>
                            <button
                                onClick={() => setSubmitted(false)}
                                className="text-xs text-emerald-800 underline font-semibold mt-2 block mx-auto"
                            >
                                Kirim masukan lain
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
                            {/* Rating Bintang */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Penilaian Anda</label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            type="button"
                                            key={star}
                                            onClick={() => setRating(star)}
                                            className="p-1 text-amber-400 hover:scale-110 transition-transform"
                                        >
                                            <Star
                                                className={`w-7 h-7 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                                            />
                                        </button>
                                    ))}
                                    <span className="text-xs font-bold text-amber-800 ml-2">
                                        {rating === 5 ? 'Sangat Puas' : rating === 4 ? 'Puas' : rating === 3 ? 'Cukup' : 'Kurang'}
                                    </span>
                                </div>
                            </div>

                            {/* Pilihan Kategori */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Kategori Masukan</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { id: 'pelayanan', label: 'Pelayanan' },
                                        { id: 'minuman', label: 'Minuman' },
                                        { id: 'tempat', label: 'Tempat' },
                                        { id: 'harga', label: 'Harga' },
                                        { id: 'lainnya', label: 'Lainnya' },
                                    ].map((cat) => (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => setCategory(cat.id)}
                                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                                                category === cat.id
                                                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm'
                                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Teks Pesan */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Pesan / Saran</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder="Tuliskan saran Anda di sini..."
                                    className="w-full text-xs p-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700 bg-slate-50 text-slate-800"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitFeedback.isPending || !message.trim()}
                                className="w-full bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-bold text-xs py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                                {submitFeedback.isPending ? 'Mengirim...' : 'Kirim Masukan'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Balasan Masukan Sebelumnya */}
                {card.recent_feedback && card.recent_feedback.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 space-y-3">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Masukan Anda Sebelumnya</h4>
                        <div className="space-y-3">
                            {card.recent_feedback.map((fb, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100">
                                    <div className="flex items-center gap-1 text-amber-500">
                                        {Array.from({ length: fb.rating }).map((_, i) => (
                                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <p className="text-slate-700 font-medium">"{fb.message}"</p>
                                    {fb.owner_reply && (
                                        <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-amber-900 bg-amber-50/60 p-2 rounded-xl">
                                            <span className="font-bold block">Tanggapan Kafe:</span>
                                            <span>{fb.owner_reply}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
