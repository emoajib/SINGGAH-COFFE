import React, { useState, useEffect } from "react"
import {
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Printer,
    CheckCircle2,
    Loader2,
    ShoppingBag,
    X,
    Zap,
    Search,
    Banknote,
    Coffee,
    RotateCcw
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Dialog } from "../components/ui/dialog"
import Receipt from "../components/pos/Receipt"
import { getImageUrl, formatCurrency } from "../lib/utils"
import { useProducts } from '../hooks/useProducts'
import { useCreateOrder } from '../hooks/useOrders'
import { useSettings } from '../hooks/useSettings'

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    stock: number;
    image_url?: string;
}

interface CartItem extends Product {
    quantity: number;
}

const PosTerminal: React.FC = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastOrder, setLastOrder] = useState<any>(null);
    const [showCashModal, setShowCashModal] = useState(false);
    const [cashAmount, setCashAmount] = useState<number>(0);
    const [lastCashGiven, setLastCashGiven] = useState<number>(0);
    const [lastChangeAmount, setLastChangeAmount] = useState<number>(0);
    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

    const productsQuery = useProducts();
    const isLoadingProducts = productsQuery.isLoading;
    const productsRaw = productsQuery.data;

    const dbProducts = Array.isArray(productsRaw) ? (productsRaw as unknown as Product[]) : [];
    const products: Product[] = dbProducts;
    const { data: settingsArr, error: settingsError } = useSettings();
    const createOrder = useCreateOrder();

    useEffect(() => {
        if (settingsArr) {
            if (Array.isArray(settingsArr)) {
                const mapped = settingsArr.reduce(
                    (acc, s) => ({ ...acc, [s.key]: s.value }),
                    {} as Record<string, string>
                );
                setSettings(mapped);
            } else {
                setSettings(settingsArr);
            }
        }
    }, [settingsArr]);

    useEffect(() => {
        if (Array.isArray(products) && products.length > 0) {
            const cats = ['All', ...new Set(products.map(p => p.category))] as string[];
            setCategories(cats);
        }
    }, [products]);

    useEffect(() => {
        if ((!isLoadingProducts && settingsArr) || settingsError) {
            setLoading(false);
        }
    }, [isLoadingProducts, settingsArr, settingsError]);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 15000);
        return () => clearTimeout(timer);
    }, []);

     const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
     const serviceRate = (parseFloat(settings?.service_charge) || 0) / 100;
     const taxRate = (parseFloat(settings?.tax_percentage) || 0) / 100;
     const serviceFee = subtotal * serviceRate;
     const tax = (subtotal + serviceFee) * taxRate;
     const total = subtotal + serviceFee + tax;

     const logoUrl = settings?.outlet_logo_url || ""
     const outletName = settings?.outlet_name || "Singgah Coffee"

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const clearCart = () => setCart([]);

    const handleCheckout = async (method: string) => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const orderData = {
                items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
                payment_method: method,
                customer_email: "customer@example.com"
            };
            const data = await createOrder.mutateAsync(orderData) as any;

            setLastOrder(data.order || data);
            setInvoiceUrl(data.invoice_url || null);
            setCart([]);
            setShowSuccess(true);

            if (method === 'QRIS' && data.invoice_url) {
                window.open(data.invoice_url, '_blank');
            }
        } catch (error: any) {
            alert('Checkout gagal: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              p.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-amber-50/50">
            <Loader2 className="w-12 h-12 animate-spin text-amber-700 mb-3" />
            <p className="font-bold text-amber-900 animate-pulse">Memuat Kasir...</p>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row h-full bg-slate-100 overflow-hidden font-sans text-slate-800">
            
            {/* Main Section: Catalog & Header */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 border-r border-slate-200">
                
                 {/* Header */}
                 <header className="bg-white border-b border-slate-200 p-4 md:px-6 md:py-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                     <div className="flex items-center gap-3">
                         {logoUrl ? (
                             <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-amber-900/20">
                                 <img src={getImageUrl(logoUrl)} alt="Logo" className="w-full h-full object-cover" />
                             </div>
                         ) : (
                             <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center font-black shadow-md shadow-amber-900/20">
                                 <Coffee size={22} />
                             </div>
                         )}
                         <div>
                             <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
                                 {outletName}
                             </h1>
                         </div>
                     </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Cari produk atau kategori..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 pl-10 pr-8 text-sm font-medium focus:bg-white focus:border-amber-600 focus:outline-none transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </header>

                {/* Category Navigation */}
                <div className="bg-white border-b border-slate-200 px-4 py-3 flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar shadow-inner">
                    {categories.map(cat => {
                        const isSelected = selectedCategory === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                                    isSelected
                                        ? 'bg-amber-700 text-white shadow-md shadow-amber-900/20 scale-[1.02]'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                            >
                                {cat === 'All' ? 'Semua Kategori' : cat}
                            </button>
                        );
                    })}
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-12">
                            <Coffee size={48} strokeWidth={1.5} className="text-slate-300" />
                            <p className="text-sm font-semibold">Produk tidak ditemukan</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5">
                            {filteredProducts.map(product => {
                                const cartItem = cart.find(i => i.id === product.id);
                                const isOutOfStock = product.stock <= 0;
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => !isOutOfStock && addToCart(product)}
                                        className={`group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-500/30 transition-all duration-300 flex flex-col overflow-hidden relative cursor-pointer active:scale-95 ${
                                            isOutOfStock ? 'opacity-50 pointer-events-none' : ''
                                        }`}
                                    >
                                        {/* Product Image */}
                                        <div className="h-36 w-full relative bg-slate-100 overflow-hidden">
                                            <img
                                                src={getImageUrl(product.image_url) || 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=400'}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                alt={product.name}
                                            />
                                            {cartItem && (
                                                <div className="absolute top-2.5 right-2.5 bg-amber-700 text-white font-black text-xs px-2.5 py-1 rounded-lg shadow-lg animate-in zoom-in-50">
                                                    {cartItem.quantity}x
                                                </div>
                                            )}
                                            {isOutOfStock && (
                                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                                                    <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-md shadow">Stok Habis</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Details */}
                                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-0.5">{product.category}</span>
                                                <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-amber-800 transition-colors">{product.name}</h3>
                                            </div>
                                            
                                            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-medium">Harga</span>
                                                    <span className="text-sm font-black text-slate-900">{formatCurrency(product.price)}</span>
                                                </div>
                                                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-700 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Section: Order Cart Sidebar */}
            <div className="w-full lg:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col h-[45vh] lg:h-full shadow-2xl z-20 shrink-0 overflow-hidden">
                
                {/* Cart Header (Fixed Top) */}
                <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-amber-700" />
                        <h2 className="text-lg font-black text-slate-900">Detail Pesanan</h2>
                    </div>
                    {cart.length > 0 && (
                        <button
                            onClick={clearCart}
                            className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                        >
                            <RotateCcw size={13} /> Reset
                        </button>
                    )}
                </div>

                {/* Cart List (ONLY THIS PART SCROLLS) */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 min-h-0">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3 py-6">
                            <ShoppingBag size={56} strokeWidth={1} />
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Keranjang Kosong</p>
                            <p className="text-[11px] text-slate-400 text-center max-w-[200px]">Pilih produk di sebelah kiri untuk menambahkan ke pesanan</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 group hover:border-amber-300 transition-all">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 truncate">{item.name}</h4>
                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{formatCurrency(item.price)}</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Quantity Controls */}
                                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-md transition-colors font-bold"
                                        >
                                            <Minus size={13} />
                                        </button>
                                        <span className="w-7 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-md transition-colors font-bold"
                                        >
                                            <Plus size={13} />
                                        </button>
                                    </div>

                                    <div className="text-right min-w-[70px]">
                                        <span className="text-xs font-black text-slate-900 block">
                                            {formatCurrency(item.price * item.quantity)}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                                        title="Hapus"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Bottom Fixed Area: Calculation Summary & Payment Buttons (FIXED / NON-SCROLLABLE) */}
                <div className="shrink-0 bg-white border-t border-slate-200">
                    {/* Calculation Summary */}
                    <div className="p-3 md:p-4 bg-slate-50/80 space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                            <span>Subtotal</span>
                            <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                        </div>
                        {serviceFee > 0 && (
                            <div className="flex justify-between text-xs text-slate-500 font-medium">
                                <span>Layanan ({(serviceRate * 100).toFixed(0)}%)</span>
                                <span className="font-bold text-slate-800">{formatCurrency(serviceFee)}</span>
                            </div>
                        )}
                        {tax > 0 && (
                            <div className="flex justify-between text-xs text-slate-500 font-medium">
                                <span>Pajak ({(taxRate * 100).toFixed(0)}%)</span>
                                <span className="font-bold text-slate-800">{formatCurrency(tax)}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                            <div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Tagihan</span>
                                <span className="text-xl font-black text-amber-800">{formatCurrency(total)}</span>
                            </div>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                                {cart.reduce((a, b) => a + b.quantity, 0)} Items
                            </span>
                        </div>
                    </div>

                    {/* Payment Action Buttons (Sticky Bottom) */}
                    <div className="p-3 border-t border-slate-200 grid grid-cols-2 gap-2.5 bg-white">
                        <button
                            onClick={() => {
                                setCashAmount(0);
                                setShowCashModal(true);
                            }}
                            disabled={cart.length === 0}
                            className="py-3 px-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
                        >
                            <Banknote size={16} /> Tunai
                        </button>
                        <button
                            onClick={() => handleCheckout('QRIS')}
                            disabled={cart.length === 0}
                            className="py-3 px-3 bg-amber-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-amber-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-900/20 flex items-center justify-center gap-2"
                        >
                            <CreditCard size={16} /> QRIS
                        </button>
                    </div>
                </div>

            </div>

            {/* Cash Payment Modal */}
            <Dialog
                isOpen={showCashModal}
                onClose={() => setShowCashModal(false)}
                title="Pembayaran Tunai"
            >
                <div className="space-y-5 p-2">
                    {/* Bill Display */}
                    <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/60 text-center">
                        <p className="text-xs font-black text-amber-700/70 uppercase tracking-widest mb-0.5">Total Pembayaran</p>
                        <h3 className="text-3xl font-black text-amber-900">{formatCurrency(total)}</h3>
                    </div>

                    {/* Cash Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Uang Diterima (Rp)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">Rp</span>
                            <input
                                type="number"
                                value={cashAmount || ''}
                                onChange={(e) => setCashAmount(Number(e.target.value))}
                                className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-12 pr-4 font-black text-2xl text-slate-900 focus:border-amber-600 focus:outline-none transition-all"
                                placeholder="0"
                                autoFocus
                            />
                            {cashAmount > 0 && (
                                <button
                                    onClick={() => setCashAmount(0)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Preset Nominal Buttons */}
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pilihan Cepat Uang Tunai</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                                onClick={() => setCashAmount(total)}
                                className={`py-3 px-2 rounded-xl text-xs font-black transition-all border ${
                                    cashAmount === total
                                        ? 'bg-amber-700 text-white border-amber-700 shadow-md'
                                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                }`}
                            >
                                Uang Pas
                            </button>
                            {[20000, 50000, 100000].map(nominal => (
                                <button
                                    key={nominal}
                                    onClick={() => setCashAmount(nominal)}
                                    className={`py-3 px-2 rounded-xl text-xs font-black transition-all border ${
                                        cashAmount === nominal
                                            ? 'bg-amber-700 text-white border-amber-700 shadow-md'
                                            : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                                    }`}
                                >
                                    {formatCurrency(nominal)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add-on Money Buttons */}
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tambah Pecahan (+)</p>
                        <div className="grid grid-cols-4 gap-2">
                            {[5000, 10000, 20000, 50000].map(addVal => (
                                <button
                                    key={addVal}
                                    onClick={() => setCashAmount(prev => prev + addVal)}
                                    className="py-2 px-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-all"
                                >
                                     + {formatCurrency(addVal)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Change / Status Display */}
                    <div className={`p-4 rounded-2xl transition-all border ${
                        cashAmount >= total
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : cashAmount > 0
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                        {cashAmount >= total ? (
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Kembalian</span>
                                <h3 className="text-2xl font-black text-emerald-700">
                                    {formatCurrency(cashAmount - total)}
                                </h3>
                            </div>
                        ) : cashAmount > 0 ? (
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 block">Uang Kurang</span>
                                    <span className="text-[11px] text-amber-600 font-medium">Kurang {formatCurrency(total - cashAmount)} lagi</span>
                                </div>
                                <h3 className="text-xl font-black text-amber-700">
                                    - {formatCurrency(total - cashAmount)}
                                </h3>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Kembalian</span>
                                <h3 className="text-2xl font-black text-slate-300">
                                    Rp 0
                                </h3>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" className="flex-1 py-5 rounded-xl font-bold border-slate-200" onClick={() => setShowCashModal(false)}>
                            Batal
                        </Button>
                        <Button
                            className="flex-1 py-5 rounded-xl font-bold bg-amber-700 hover:bg-amber-800 text-white shadow-md"
                            disabled={cashAmount < total || loading}
                            onClick={() => {
                                const change = Math.max(0, cashAmount - total);
                                setLastCashGiven(cashAmount);
                                setLastChangeAmount(change);
                                setShowCashModal(false);
                                handleCheckout('Cash');
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Selesaikan Pembayaran'}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Success & Print Modal */}
            <Dialog
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="Transaksi Berhasil"
                footer={
                    <div className="grid grid-cols-2 gap-3 w-full no-print">
                        <Button variant="outline" onClick={handlePrint} className="gap-2 font-bold border-slate-300">
                            <Printer className="w-4 h-4" /> Cetak Struk
                        </Button>
                        <Button onClick={() => setShowSuccess(false)} className="bg-amber-700 hover:bg-amber-800 text-white font-bold">
                            Transaksi Baru
                        </Button>
                    </div>
                }
            >
                <div className="text-center p-4">
                    {lastOrder?.payment_status === 'Unpaid' ? (
                        <div className="animate-pulse mb-4">
                            <CreditCard className="w-16 h-16 text-amber-700 mx-auto" />
                        </div>
                    ) : (
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    )}
                    <h2 className="text-2xl font-bold text-slate-900">
                        {lastOrder?.payment_status === 'Unpaid' ? 'Pesanan Menunggu Pembayaran' : 'Transaksi Selesai!'}
                    </h2>
                    <p className="text-slate-500 mb-4 font-medium text-sm">
                        {lastOrder?.payment_status === 'Unpaid'
                            ? 'Silakan tunjukkan QRIS ke pelanggan untuk discan.'
                            : 'Pesanan telah berhasil diproses.'}
                    </p>

                    {/* Highlight Information Kembalian Uang Tunai */}
                    {lastOrder?.payment_method === 'Cash' && (
                        <div className="my-4 p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-center shadow-sm">
                            <p className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-1">
                                💵 Uang Kembalian Pelanggan
                            </p>
                            <h3 className="text-3xl font-black text-emerald-700">
                                {formatCurrency(lastChangeAmount)}
                            </h3>
                            <div className="mt-2 pt-2 border-t border-emerald-200/60 flex justify-between text-xs text-emerald-900 font-semibold px-2">
                                <span>Tunai Diterima: <strong>{formatCurrency(lastCashGiven)}</strong></span>
                                <span>Total Tagihan: <strong>{formatCurrency(lastOrder?.total_amount || 0)}</strong></span>
                            </div>
                        </div>
                    )}

                    {invoiceUrl && lastOrder?.payment_status === 'Unpaid' && (
                        <Button
                            className="w-full bg-amber-700 hover:bg-amber-800 text-white font-bold mb-4"
                            onClick={() => window.open(invoiceUrl, '_blank')}
                        >
                            <Zap className="w-4 h-4 mr-2" /> Buka Halaman QRIS
                        </Button>
                    )}
                </div>

                <div className="hidden">
                    {lastOrder && <Receipt {...lastOrder} />}
                </div>
            </Dialog>

            <div className="sr-only whitespace-pre">
                {lastOrder && <Receipt {...lastOrder} />}
            </div>
        </div>
    )
}

export default PosTerminal
