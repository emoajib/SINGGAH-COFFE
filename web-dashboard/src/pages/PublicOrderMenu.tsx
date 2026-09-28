// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coffee,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
  Search,
  ArrowRight,
  BadgeAlert,
  User,
  Check
} from 'lucide-react';
import { publicOrderService } from '../services/publicOrderService';
import type { PublicMenuResponse, PublicMenuItem } from '../types';
import { formatCurrency, getImageUrl } from '../lib/utils';

interface CartItem {
  product: PublicMenuItem;
  quantity: number;
  notes: string;
}

export default function PublicOrderMenu() {
  const navigate = useNavigate();
  const [menuData, setMenuData] = useState<PublicMenuResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Notes Modal for a specific item
  const [noteModalItem, setNoteModalItem] = useState<PublicMenuItem | null>(null);
  const [tempNote, setTempNote] = useState<string>('');

  // Customer Checkout Form
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if customer already has active order in localStorage
  const [activeToken, setActiveToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('singgah_active_order_token');
    if (savedToken) {
      setActiveToken(savedToken);
    }

    // Load public menu
    const fetchMenu = async () => {
      try {
        setIsLoading(true);
        const data = await publicOrderService.getMenu();
        setMenuData(data);
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.error || 'Gagal memuat katalog menu Singgah Coffee.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const categories = useMemo(() => {
    if (!menuData || !Array.isArray(menuData.categories)) return ['Semua'];
    return ['Semua', ...menuData.categories];
  }, [menuData]);

  const itemsList = useMemo<PublicMenuItem[]>(() => {
    if (!menuData) return [];
    if (Array.isArray(menuData.items)) return menuData.items;
    if (Array.isArray(menuData.products)) return menuData.products;
    return [];
  }, [menuData]);

  const filteredItems = useMemo<PublicMenuItem[]>(() => {
    return itemsList.filter((item: PublicMenuItem) => {
      const matchCat = selectedCategory === 'Semua' || item.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [itemsList, selectedCategory, searchQuery]);

  // Cart Calculations
  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const subtotalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  // Add Item to Cart
  const handleAddToCart = (product: PublicMenuItem, notes = '') => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (it) => it.product.id === product.id && it.notes === notes
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, { product, quantity: 1, notes }];
    });
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index].quantity = newQty;
      }
      return next;
    });
  };

  const handleOpenNoteModal = (product: PublicMenuItem) => {
    setNoteModalItem(product);
    setTempNote('');
  };

  const handleConfirmNoteAdd = () => {
    if (noteModalItem) {
      handleAddToCart(noteModalItem, tempNote.trim());
      setNoteModalItem(null);
      setTempNote('');
    }
  };

  // Submit Order to Server
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanName = customerName.trim();
    if (!cleanName || cleanName.length < 2) {
      setSubmitError('Harap masukkan nama pemesan (minimal 2 karakter).');
      return;
    }
    if (cleanName.length > 40) {
      setSubmitError('Nama pemesan maksimal 40 karakter.');
      return;
    }
    if (cart.length === 0) {
      setSubmitError('Keranjang pesanan masih kosong.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customer_name: cleanName,
        customer_phone: customerPhone.trim(),
        notes: generalNotes.trim(),
        items: cart.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          notes: it.notes,
        })),
      };

      const result = await publicOrderService.createOrder(payload);

      // Save token in localStorage
      localStorage.setItem('singgah_active_order_token', result.tracking_token);
      localStorage.setItem('singgah_active_pickup_code', result.pickup_code);

      // Clear cart
      setCart([]);
      setIsCartOpen(false);

      // Navigate to order status tracker
      navigate(`/order/status/${result.tracking_token}`);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Gagal mengirim pesanan. Silakan coba kembali atau pesan di kasir.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4 animate-bounce">
          <Coffee className="w-8 h-8 text-[#4B3621]" />
        </div>
        <h2 className="text-xl font-black text-[#4B3621] tracking-tight">Singgah Coffee</h2>
        <p className="text-xs text-amber-800/70 mt-1 font-medium">Menyiapkan buku menu digital...</p>
      </div>
    );
  }

  // 1. Specifically disabled by outlet owner in settings
  if (menuData && menuData.self_order_enabled === false) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
          <BadgeAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Pemesanan Mandiri Dinonaktifkan</h2>
        <p className="text-xs text-slate-600 mt-2 max-w-sm">
          Kedai saat ini sedang menonaktifkan pemesanan via smartphone. Silakan langsung memesan ke meja kasir.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-5 py-2.5 bg-[#4B3621] text-amber-300 rounded-xl font-bold text-xs shadow-md"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  // 2. Generic network or server error
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-4">
          <BadgeAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Gagal Memuat Menu</h2>
        <p className="text-xs text-slate-600 mt-2 max-w-sm">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-5 py-2.5 bg-[#4B3621] text-amber-300 rounded-xl font-bold text-xs shadow-md"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-slate-800 pb-28 font-sans selection:bg-amber-200">
      {/* Top Banner / Header */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-amber-900/10 px-4 py-3 transition-all">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {menuData?.logo_url ? (
              <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-sm border border-amber-900/10 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={getImageUrl(menuData.logo_url)}
                  alt={menuData.store_name || "Singgah Coffee"}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#4B3621] text-amber-300 flex items-center justify-center shadow-sm shrink-0">
                <Coffee className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-base font-black tracking-tight text-[#4B3621]">
                {menuData?.store_name || "Singgah Coffee"}
              </h1>
              <p className="text-[10px] font-semibold text-amber-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Pesan Mandiri &middot; Bayar di Kasir
              </p>
            </div>
          </div>

          {activeToken && (
            <button
              onClick={() => navigate(`/order/status/${activeToken}`)}
              className="text-[11px] font-bold px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-full border border-amber-300/80 flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Tiket Aktif</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero Welcome Card with Owner Logo & Customer Name Input */}
      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="bg-gradient-to-br from-[#4B3621] via-[#5D4329] to-[#362617] rounded-3xl p-5 text-white shadow-xl relative overflow-hidden space-y-4">
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3" /> Menu Pilihan Singgah
              </div>
              <h2 className="text-lg font-black tracking-tight leading-snug">
                Nikmati Kopi & Kudapan Favoritmu Hari Ini
              </h2>
              <p className="text-xs text-amber-100/80 mt-1 leading-relaxed">
                Pilih menu, kirim pesanan, dan tunjukkan 4-digit kode ke kasir untuk proses seduh kilat.
              </p>
            </div>

            {menuData?.logo_url && (
              <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-md shrink-0 border border-amber-400/30 flex items-center justify-center overflow-hidden">
                <img
                  src={getImageUrl(menuData.logo_url)}
                  alt="Logo Toko"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Form Input Data Pemesan Terbuka Langsung di Awal */}
          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" /> Nama Pemesan:
              </span>
              <span className="text-[10px] text-amber-200/80 font-medium">Wajib diisi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nama Anda (cth: Kak Salsa / Rian)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={40}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white text-slate-800 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
              />
              <input
                type="tel"
                placeholder="No. WhatsApp / HP (Opsional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                maxLength={20}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white text-slate-800 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-sm"
              />
            </div>

            {customerName.trim() ? (
              <p className="text-[11px] text-emerald-300 font-bold flex items-center gap-1 pt-0.5">
                <Check className="w-3.5 h-3.5" />
                Pesanan akan dipanggil barista atas nama: <span className="text-white underline">{customerName.trim()}</span>
              </p>
            ) : (
              <p className="text-[10px] text-amber-200/70">
                Nama ini akan dipanggil barista saat kopi Anda siap diambil di bar.
              </p>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-900/40" />
          <input
            type="text"
            placeholder="Cari kopi, mocktail, cemilan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs bg-white border border-amber-900/10 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 transition-all text-slate-800 placeholder:text-amber-900/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar -mx-4 px-4 mt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                selectedCategory === cat
                  ? 'bg-[#4B3621] text-amber-300 shadow-md scale-105'
                  : 'bg-white text-slate-700 hover:bg-amber-50 border border-amber-900/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Catalog List */}
      <main className="max-w-md mx-auto px-4 mt-2 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-amber-900/10 shadow-sm mt-4">
            <Coffee className="w-12 h-12 text-amber-900/30 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700">Menu Tidak Ditemukan</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tidak ada menu dalam kategori atau pencarian "{searchQuery}".
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const inCart = cart.filter((c) => c.product.id === item.id);
            const totalQty = inCart.reduce((sum, c) => sum + c.quantity, 0);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3.5 border border-amber-900/10 shadow-sm flex gap-3.5 hover:shadow-md transition-shadow relative overflow-hidden"
              >
                {/* Product Image */}
                <div className="w-20 h-20 shrink-0 rounded-xl bg-amber-50 overflow-hidden relative border border-amber-900/5">
                  {item.image_url ? (
                    <img
                      src={getImageUrl(item.image_url)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-900/30">
                      <Coffee className="w-7 h-7" />
                    </div>
                  )}
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-[10px] font-bold text-white uppercase text-center p-1">
                      Habis
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">{item.name}</h3>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                        {item.category}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
                    <span className="text-sm font-black text-[#4B3621]">
                      {formatCurrency(item.price)}
                    </span>

                    {item.available ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenNoteModal(item)}
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-900 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                          title="Tambah dengan catatan racikan"
                        >
                          + Catatan
                        </button>

                        {totalQty > 0 ? (
                          <div className="flex items-center gap-1 bg-[#4B3621] text-amber-300 rounded-xl px-1.5 py-0.5 shadow-sm">
                            <span className="text-xs font-black px-1.5">{totalQty}</span>
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="w-6 h-6 rounded-lg bg-amber-400 text-amber-950 flex items-center justify-center font-bold active:scale-90 transition-transform"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className="text-xs font-bold px-3 py-1.5 bg-[#4B3621] text-amber-300 rounded-xl hover:bg-[#3d2c1a] active:scale-95 transition-all shadow-sm flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">Stok Habis</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-gradient-to-r from-[#4B3621] to-[#362617] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between border border-amber-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-sm shadow">
                  {totalItemCount}
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-amber-200/80 uppercase font-bold tracking-wider block">
                    Total Pesanan
                  </span>
                  <span className="text-base font-black text-amber-300">
                    {formatCurrency(subtotalPrice)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-amber-400 text-amber-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow">
                <span>Lihat Keranjang</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modal Tambah Catatan Racikan */}
      {noteModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-slate-800 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setNoteModalItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-extrabold text-slate-900 pr-6">
              Catatan untuk {noteModalItem.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Sesuaikan racikan dengan seleramu (misal: less ice, manis sedang, extra shot).
            </p>

            {/* Quick note buttons */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['Less Ice', 'No Ice', 'Less Sweet', 'Normal Sweet', 'Extra Hot', 'Pisah Gula'].map(
                (quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => {
                      setTempNote((prev) => (prev ? `${prev}, ${quick}` : quick));
                    }}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    + {quick}
                  </button>
                )
              )}
            </div>

            <textarea
              rows={3}
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Tulis instruksi racikan spesifik..."
              maxLength={100}
              className="w-full mt-3 p-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none"
            />

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setNoteModalItem(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmNoteAdd}
                className="flex-1 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow"
              >
                Tambahkan ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer / Checkout Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl relative border border-slate-100">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#4B3621]" />
                <h3 className="text-base font-extrabold text-slate-900">Pesanan Anda</h3>
                <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full">
                  {totalItemCount} item
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-amber-50/50 border border-amber-900/10 rounded-2xl p-3 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-900 truncate">
                      {item.product.name}
                    </h4>
                    <span className="text-[11px] font-bold text-[#4B3621]">
                      {formatCurrency(item.product.price)}
                    </span>
                    {item.notes && (
                      <p className="text-[10px] text-amber-800 italic mt-0.5">
                        Catatan: {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border border-amber-900/20 rounded-xl bg-white overflow-hidden shadow-sm">
                      <button
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-extrabold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleUpdateQty(idx, -item.quantity)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Customer Input Details */}
              <form id="order-form" onSubmit={handleSubmitOrder} className="pt-2 space-y-3">
                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-xs font-black text-slate-800 mb-1">
                    Nama Pemesan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dimas / Kak Salsa"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    maxLength={40}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Nama akan dipanggil barista saat pesanan siap diambil.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. WhatsApp / HP <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="0812xxxx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    maxLength={20}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Pesanan Tambahan <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Minuman disajikan belakangan, takeaway"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    maxLength={100}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none"
                  />
                </div>

                {submitError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Footer with Price & Submit */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 rounded-b-3xl">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-slate-600">Subtotal</span>
                <span className="font-extrabold text-slate-900">{formatCurrency(subtotalPrice)}</span>
              </div>

              <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl p-2.5 mb-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-900 leading-snug">
                  Setelah menekan <strong>Kirim Pesanan</strong>, Anda akan menerima <strong>4-Digit Kode Pengambilan</strong>. Silakan tunjukkan ke kasir untuk pembayaran & pesanan akan langsung diracik.
                </p>
              </div>

              <button
                type="submit"
                form="order-form"
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 bg-gradient-to-r from-[#4B3621] to-[#362617] text-amber-300 font-black text-sm rounded-xl shadow-lg hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Mengirim Pesanan...</span>
                ) : (
                  <>
                    <span>Kirim Pesanan Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
