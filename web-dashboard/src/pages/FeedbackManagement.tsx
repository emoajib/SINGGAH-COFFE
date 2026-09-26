// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState } from 'react';
import { useFeedbacks, useLoyaltyPrograms, useLoyaltyMutations } from '../hooks/useLoyalty';
import { MessageSquare, Star, Reply, Gift, Plus } from 'lucide-react';
import type { CustomerFeedback } from '../types';

export default function FeedbackManagement() {
    const [activeTab, setActiveTab] = useState<'feedback' | 'programs'>('feedback');
    const [selectedFeedback, setSelectedFeedback] = useState<CustomerFeedback | null>(null);
    const [replyText, setReplyText] = useState<string>('');
    const [showCreateProgramModal, setShowCreateProgramModal] = useState<boolean>(false);

    // Form state untuk program loyalitas baru
    const [progName, setProgName] = useState('');
    const [progDesc, setProgDesc] = useState('');
    const [progThreshold, setProgThreshold] = useState<number>(10);
    const [progRewardType, setProgRewardType] = useState('free_menu');
    const [progRewardNote, setProgRewardNote] = useState('');

    const { data: feedbacks, isLoading: loadingFeedbacks } = useFeedbacks();
    const { data: programs, isLoading: loadingPrograms } = useLoyaltyPrograms();
    const { replyFeedback, createProgram } = useLoyaltyMutations();

    const handleSendReply = () => {
        if (!selectedFeedback || !replyText.trim()) return;
        replyFeedback.mutate(
            { id: selectedFeedback.id, reply: replyText.trim() },
            {
                onSuccess: () => {
                    setSelectedFeedback(null);
                    setReplyText('');
                }
            }
        );
    };

    const handleCreateProgram = (e: React.FormEvent) => {
        e.preventDefault();
        createProgram.mutate(
            {
                name: progName,
                description: progDesc,
                threshold_type: 'order_count',
                threshold_value: Number(progThreshold) || 10,
                reward_type: progRewardType,
                reward_note: progRewardNote,
                is_active: true,
            },
            {
                onSuccess: () => {
                    setShowCreateProgramModal(false);
                    setProgName('');
                    setProgDesc('');
                    setProgRewardNote('');
                }
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Kritik, Saran & Loyalitas</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Dengarkan kepuasan pelanggan dan atur program reward stempel kafe.
                        </p>
                    </div>
                </div>

                {/* Navigasi Tab */}
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'feedback'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Masukan Pelanggan ({feedbacks?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('programs')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'programs'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Program Stempel ({programs?.length || 0})
                    </button>
                </div>
            </div>

            {/* Konten Tab 1: Feedback Pelanggan */}
            {activeTab === 'feedback' && (
                <div className="space-y-4">
                    {loadingFeedbacks ? (
                        <div className="p-8 text-center text-slate-400 text-xs">Memuat masukan pelanggan...</div>
                    ) : feedbacks?.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-2">
                            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                            <h4 className="text-sm font-bold text-slate-700">Belum Ada Masukan Pelanggan</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Masukan akan otomatis tampil di sini saat pelanggan memindai QR code pada struk pembayaran.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedbacks?.map((fb) => (
                                <div
                                    key={fb.id}
                                    className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between space-y-3"
                                >
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-1 text-amber-500">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${
                                                            i < fb.rating
                                                                ? 'fill-amber-400 text-amber-400'
                                                                : 'text-slate-200'
                                                        }`}
                                                    />
                                                ))}
                                                <span className="text-xs font-bold text-slate-600 ml-1">
                                                    ({fb.rating}/5)
                                                </span>
                                            </div>
                                            <span
                                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    fb.status === 'replied'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}
                                            >
                                                {fb.status === 'replied' ? 'Sudah Dibalas' : 'Menunggu Balasan'}
                                            </span>
                                        </div>

                                        <div className="mt-2.5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md inline-block mb-1">
                                                Kategori: {fb.category}
                                            </span>
                                            <p className="text-sm font-medium text-slate-800 mt-1">"{fb.message}"</p>
                                        </div>

                                        {fb.owner_reply && (
                                            <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-xs space-y-0.5 text-amber-900">
                                                <span className="font-bold text-[11px] block text-amber-800">
                                                    Balasan Anda:
                                                </span>
                                                <p>{fb.owner_reply}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[11px] text-slate-400">
                                            {new Date(fb.submitted_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedFeedback(fb);
                                                setReplyText(fb.owner_reply || '');
                                            }}
                                            className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1.5 py-1 px-2.5 rounded-xl hover:bg-amber-50 transition-colors"
                                        >
                                            <Reply className="w-3.5 h-3.5" />
                                            {fb.owner_reply ? 'Ubah Balasan' : 'Balas Masukan'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Konten Tab 2: Program Loyalitas Stempel */}
            {activeTab === 'programs' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowCreateProgramModal(true)}
                            className="bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-bold text-xs py-2.5 px-4 rounded-2xl flex items-center gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            Buat Program Stempel Baru
                        </button>
                    </div>

                    {loadingPrograms ? (
                        <div className="p-8 text-center text-slate-400 text-xs">Memuat program loyalitas...</div>
                    ) : programs?.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-2">
                            <Gift className="w-10 h-10 text-slate-300 mx-auto" />
                            <h4 className="text-sm font-bold text-slate-700">Belum Ada Program Stempel</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Buat program stempel pertama Anda (contoh: Kumpulkan 10 stempel gratis 1 kopi).
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {programs?.map((prog) => (
                                <div
                                    key={prog.id}
                                    className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-extrabold text-slate-900 text-base">{prog.name}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">{prog.description || 'Program stempel loyalitas kafe'}</p>
                                        </div>
                                        <span className="text-xs font-black px-3 py-1 bg-amber-100 text-amber-900 rounded-full">
                                            {prog.threshold_value} Stempel
                                        </span>
                                    </div>

                                    <div className="p-3 bg-amber-50/60 border border-amber-200/50 rounded-2xl text-xs space-y-1">
                                        <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                                            Hadiah Reward:
                                        </span>
                                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                                            <Gift className="w-4 h-4 text-amber-700" />
                                            {prog.reward_note || 'Menu Gratis / Hadiah'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Balas Masukan Pelanggan */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-base text-slate-900">Tanggapi Masukan Pelanggan</h3>
                            <button
                                onClick={() => setSelectedFeedback(null)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 italic border border-slate-100">
                            "{selectedFeedback.message}"
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                                Balasan Resmi Kafe (Akan dilihat pelanggan di kartu QR mereka)
                            </label>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={4}
                                placeholder="Contoh: Terima kasih banyak atas masukannya, kami akan tingkatkan lagi..."
                                className="w-full text-xs p-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700 bg-slate-50 text-slate-800"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <button
                                onClick={() => setSelectedFeedback(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSendReply}
                                disabled={replyFeedback.isPending || !replyText.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-[#4B3621] hover:bg-[#3D2C1B] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                            >
                                {replyFeedback.isPending ? 'Menyimpan...' : 'Kirim Balasan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah Program Loyalitas Baru */}
            {showCreateProgramModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <form
                        onSubmit={handleCreateProgram}
                        className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="font-bold text-base text-slate-900">Buat Program Stempel Baru</h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateProgramModal(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Program</label>
                                <input
                                    type="text"
                                    value={progName}
                                    onChange={(e) => setProgName(e.target.value)}
                                    placeholder="Contoh: Kartu Kopi Singgah"
                                    required
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-700 bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Jumlah Stempel Target</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={progThreshold}
                                    onChange={(e) => setProgThreshold(Number(e.target.value))}
                                    required
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-700 bg-slate-50"
                                />
                                <span className="text-[10px] text-slate-400 mt-0.5 block">1 transaksi = 1 stempel. Setelah tercapai, stempel reset ke 0.</span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Hadiah</label>
                                <select
                                    value={progRewardType}
                                    onChange={(e) => setProgRewardType(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-700 bg-slate-50"
                                >
                                    <option value="free_menu">Menu Minuman Gratis</option>
                                    <option value="souvenir">Cindera Mata / Souvenir (Mug, Baju, dll)</option>
                                    <option value="discount">Diskon Persentase</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi Hadiah</label>
                                <input
                                    type="text"
                                    value={progRewardNote}
                                    onChange={(e) => setProgRewardNote(e.target.value)}
                                    placeholder="Contoh: Gratis 1 Cup Kopi Susu Aren"
                                    required
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-700 bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3">
                            <button
                                type="button"
                                onClick={() => setShowCreateProgramModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={createProgram.isPending}
                                className="flex-1 py-2.5 rounded-xl bg-[#4B3621] hover:bg-[#3D2C1B] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                            >
                                {createProgram.isPending ? 'Menyimpan...' : 'Aktifkan Program'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
