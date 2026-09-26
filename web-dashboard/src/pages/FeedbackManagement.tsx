// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState } from 'react';
import { useFeedbacks, useLoyaltyPrograms, useCustomers, useLoyaltyMutations } from '../hooks/useLoyalty';
import {
    MessageSquare,
    Star,
    Reply,
    Gift,
    Plus,
    Users,
    QrCode,
    Printer,
    ExternalLink,
    Coffee,
    X,
    CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import type { CustomerFeedback } from '../types';

export default function FeedbackManagement() {
    const [activeTab, setActiveTab] = useState<'feedback' | 'customers' | 'programs'>('feedback');
    const [selectedFeedback, setSelectedFeedback] = useState<CustomerFeedback | null>(null);
    const [replyText, setReplyText] = useState<string>('');
    const [showCreateProgramModal, setShowCreateProgramModal] = useState<boolean>(false);
    const [showQRStandeeModal, setShowQRStandeeModal] = useState<boolean>(false);

    // Form state untuk program loyalitas baru
    const [progName, setProgName] = useState('');
    const [progDesc, setProgDesc] = useState('');
    const [progThreshold, setProgThreshold] = useState<number>(10);
    const [progRewardType, setProgRewardType] = useState('free_menu');
    const [progRewardNote, setProgRewardNote] = useState('');

    const { data: feedbacks, isLoading: loadingFeedbacks } = useFeedbacks();
    const { data: programs, isLoading: loadingPrograms } = useLoyaltyPrograms();
    const { data: customers, isLoading: loadingCustomers } = useCustomers();
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

    const publicQRUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/loyalty/public`
        : 'https://sosiomen.com/loyalty/public';

    const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(publicQRUrl)}`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-800">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Kritik, Saran & Loyalitas</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Dengarkan kepuasan pelanggan, kelola data member, dan cetak QR Code meja.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Tombol Cetak Standee Meja QR Code */}
                    <button
                        onClick={() => setShowQRStandeeModal(true)}
                        className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                        <QrCode className="w-4 h-4" />
                        <span>Cetak QR Code Meja</span>
                    </button>

                    {/* Navigasi Tab */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('feedback')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'feedback'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Masukan ({feedbacks?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('customers')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                activeTab === 'customers'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Pelanggan ({customers?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('programs')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === 'programs'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Program Stempel ({programs?.length || 0})
                        </button>
                    </div>
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
                                Masukan akan otomatis tampil di sini saat pelanggan memindai QR code pada struk kasir atau meja.
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
                                                {fb.status === 'replied' ? 'Sudah Dibalas' : 'Perlu Dibalas'}
                                            </span>
                                        </div>

                                        <p className="text-sm font-semibold text-slate-800 mt-2.5 leading-relaxed">
                                            "{fb.message}"
                                        </p>

                                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                            <span className="font-bold text-slate-600 capitalize bg-slate-100 px-2 py-0.5 rounded-md">
                                                Kategori: {fb.category}
                                            </span>
                                            <span>•</span>
                                            <span>{new Date(fb.submitted_at).toLocaleDateString('id-ID')}</span>
                                        </div>

                                        {fb.owner_reply && (
                                            <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs">
                                                <span className="font-bold text-slate-700 block mb-0.5">Balasan Outlet:</span>
                                                <p className="text-slate-600">{fb.owner_reply}</p>
                                            </div>
                                        )}
                                    </div>

                                    {fb.status !== 'replied' && (
                                        <div className="pt-2 border-t border-slate-100">
                                            <button
                                                onClick={() => setSelectedFeedback(fb)}
                                                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                            >
                                                <Reply className="w-3.5 h-3.5" />
                                                Beri Tanggapan
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Konten Tab 2: Data Pelanggan (CRM & Loyalitas) */}
            {activeTab === 'customers' && (
                <div className="space-y-4">
                    {loadingCustomers ? (
                        <div className="p-8 text-center text-slate-400 text-xs">Memuat data pelanggan...</div>
                    ) : customers?.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-2">
                            <Users className="w-10 h-10 text-slate-300 mx-auto" />
                            <h4 className="text-sm font-bold text-slate-700">Belum Ada Pelanggan Terdaftar</h4>
                            <p className="text-xs text-slate-400 max-w-sm mx-auto">
                                Saat kasir memasukkan nomor HP pelanggan saat checkout, akun pelanggan dan stempel otomatis tersimpan di sini.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 overflow-hidden">
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800">Daftar Member & Pelanggan</h3>
                                    <p className="text-xs text-slate-400">Total {customers?.length || 0} pelanggan terdata di sistem</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4 rounded-l-xl">Pelanggan</th>
                                            <th className="py-3 px-4">No. HP / WA</th>
                                            <th className="py-3 px-4">Tier Member</th>
                                            <th className="py-3 px-4 text-center">Total Order</th>
                                            <th className="py-3 px-4 text-right">Total Belanja</th>
                                            <th className="py-3 px-4 text-center rounded-r-xl">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {customers?.map((cust) => (
                                            <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center justify-center text-xs shrink-0">
                                                            {cust.name ? cust.name.charAt(0).toUpperCase() : 'P'}
                                                        </div>
                                                        <span className="font-bold text-slate-800 text-xs">
                                                            {cust.name || 'Pelanggan'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                                                    {cust.phone}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="font-bold text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase tracking-wider">
                                                        {cust.tier || 'Member'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                                                    {cust.total_orders}x
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-bold text-amber-800">
                                                    {formatCurrency(cust.total_spend || 0)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <a
                                                        href={`/loyalty/${cust.loyalty_token}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 underline"
                                                        title="Lihat kartu stempel digital pelanggan ini"
                                                    >
                                                        <span>Kartu Stempel</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Konten Tab 3: Program Stempel */}
            {activeTab === 'programs' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm text-slate-800">Program Stempel Aktif</h3>
                        <button
                            onClick={() => setShowCreateProgramModal(true)}
                            className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Buat Program Baru
                        </button>
                    </div>

                    {loadingPrograms ? (
                        <div className="p-8 text-center text-slate-400 text-xs">Memuat program stempel...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {programs?.map((prog) => (
                                <div
                                    key={prog.id}
                                    className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between space-y-4"
                                >
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                                Target: {prog.threshold_value} Stempel
                                            </span>
                                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Aktif
                                            </span>
                                        </div>
                                        <h4 className="text-base font-extrabold text-slate-900 mt-2">{prog.name}</h4>
                                        <p className="text-xs text-slate-500 mt-1">{prog.description}</p>

                                        <div className="mt-4 p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-center gap-3">
                                            <Gift className="w-6 h-6 text-amber-700 shrink-0" />
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block">
                                                    Hadiah Reward:
                                                </span>
                                                <span className="text-xs font-extrabold text-slate-800">
                                                    {prog.reward_note || 'Gratis 1 Kopi / Menu Pilihan'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Cetak Standee Meja QR Code */}
            {showQRStandeeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100">
                        <button
                            onClick={() => setShowQRStandeeModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-4">
                            <h3 className="text-base font-extrabold text-slate-900">Standee Meja QR Code</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Pajang di meja kasir atau meja kopi untuk pelanggan scan.
                            </p>
                        </div>

                        {/* Desain Akrilik Meja Siap Cetak */}
                        <div id="standee-print-area" className="bg-[#4B3621] text-[#F5F0E6] rounded-2xl p-6 text-center border-2 border-amber-900/50 shadow-inner space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 mx-auto flex items-center justify-center text-amber-300">
                                <Coffee className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-black text-base tracking-wide uppercase">Singgah Coffee</h4>
                                <p className="text-[11px] text-amber-200/90 font-medium">Tempat Singgah & Menikmati Kopi</p>
                            </div>

                            {/* Kotak QR Code */}
                            <div className="bg-white p-3 rounded-2xl inline-block shadow-md mx-auto">
                                <img
                                    src={qrImageSrc}
                                    alt="QR Code Singgah Coffee"
                                    className="w-44 h-44 object-contain mx-auto"
                                />
                            </div>

                            <div className="space-y-1 pt-1">
                                <span className="text-xs font-black uppercase text-amber-300 tracking-wider block">
                                    ⭐ Scan Di Sini ⭐
                                </span>
                                <p className="text-[10px] text-amber-100 leading-tight">
                                    Kumpulkan Stempel Digital & Dapatkan Menu Gratis atau Cinderamata Kafe!
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 space-y-2">
                            <button
                                onClick={() => window.print()}
                                className="w-full bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                            >
                                <Printer className="w-4 h-4" />
                                Cetak Standee Meja Sekarang
                            </button>
                            <button
                                onClick={() => setShowQRStandeeModal(false)}
                                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Buat Program Loyalitas Baru */}
            {showCreateProgramModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100">
                        <button
                            onClick={() => setShowCreateProgramModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-5">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 mx-auto flex items-center justify-center mb-2 border border-amber-100">
                                <Gift className="w-6 h-6 text-amber-700" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Buat Program Stempel Baru</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Tentukan jumlah stempel yang harus dikumpulkan pelanggan untuk mendapat hadiah.
                            </p>
                        </div>

                        <form onSubmit={handleCreateProgram} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Program</label>
                                <input
                                    type="text"
                                    required
                                    value={progName}
                                    onChange={(e) => setProgName(e.target.value)}
                                    placeholder="Cth: Kartu Kopi Setia 10 Cup"
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Deskripsi</label>
                                <input
                                    type="text"
                                    value={progDesc}
                                    onChange={(e) => setProgDesc(e.target.value)}
                                    placeholder="Cth: Kumpulkan 10 stempel untuk gratis 1 minuman"
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Target Stempel</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={50}
                                        required
                                        value={progThreshold}
                                        onChange={(e) => setProgThreshold(Number(e.target.value))}
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Jenis Hadiah</label>
                                    <select
                                        value={progRewardType}
                                        onChange={(e) => setProgRewardType(e.target.value)}
                                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white"
                                    >
                                        <option value="free_menu">Gratis Menu Kopi</option>
                                        <option value="souvenir">Cinderamata Kafe</option>
                                        <option value="discount">Diskon Khusus</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Detail Hadiah</label>
                                <input
                                    type="text"
                                    required
                                    value={progRewardNote}
                                    onChange={(e) => setProgRewardNote(e.target.value)}
                                    placeholder="Cth: Gratis 1 Cup Signature Aren / Tumbler Kafe"
                                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 mt-2"
                            >
                                Simpan & Aktifkan Program
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Balas Feedback */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100">
                        <button
                            onClick={() => setSelectedFeedback(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-base font-extrabold text-slate-900 mb-2">Tanggapi Masukan Pelanggan</h3>
                        <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                            "{selectedFeedback.message}"
                        </p>

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-700 block">Tulis Balasan Resmi Kafe:</label>
                            <textarea
                                rows={3}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Terima kasih atas masukannya, kami akan terus meningkatkan kualitas..."
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-700"
                            />
                            <button
                                onClick={handleSendReply}
                                className="w-full bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
                            >
                                Kirim Balasan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
