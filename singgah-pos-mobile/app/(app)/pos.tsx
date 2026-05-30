import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useProducts } from '../../src/hooks/useProducts'
import { useSettings } from '../../src/hooks/useSettings'
import { useCreateOrder } from '../../src/hooks/useOrders'
import { useCartStore } from '../../src/stores/cartStore'
import { useAuthStore } from '../../src/stores/authStore'
import { useToastStore } from '../../src/stores/toastStore'
import type { Product } from '../../src/types'

export default function PosScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data: products, isLoading } = useProducts()
  const { data: settings } = useSettings()
  const createOrder = useCreateOrder()
  const { items, addItem, removeItem, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const { showToast } = useToastStore()
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [isProcessing, setIsProcessing] = useState(false)

  const serviceCharge = parseFloat(settings?.find((s) => s.key === 'service_charge')?.value || '0') || 0
  const taxPercentage = parseFloat(settings?.find((s) => s.key === 'tax_percentage')?.value || '0') || 0

  const subtotal = items.reduce((sum, item) => {
    const product = products?.find((p) => p.id === item.productId)
    return sum + (product?.price || 0) * item.quantity
  }, 0)

  const serviceFee = subtotal * (serviceCharge / 100)
  const tax = (subtotal + serviceFee) * (taxPercentage / 100)
  const total = subtotal + serviceFee + tax

  const handleCheckout = async () => {
    if (items.length === 0 || isProcessing) return
    setIsProcessing(true)
    try {
      const now = new Date()
      const orderNumber = `ORD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

      await createOrder.mutateAsync({
        order_number: orderNumber,
        payment_method: paymentMethod,
        cashier_name: user?.name || 'Unknown',
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      })

      clearCart()
      showToast('Transaction completed!', 'success')
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Transaction failed'
      showToast(message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => addItem(item.id)} activeOpacity={0.7}>
      <Text style={styles.productIcon}>☕</Text>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productPrice}>Rp {(item.price || 0).toLocaleString('id-ID')}</Text>
      <Text style={styles.productStock}>Stock: {item.stock}</Text>
    </TouchableOpacity>
  )

  const renderCartItem = ({ item }: { item: { productId: number; quantity: number } }) => {
    const product = products?.find((p) => p.id === item.productId)
    return (
      <View style={styles.cartItem}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartItemName}>{product?.name || 'Unknown'}</Text>
          <Text style={styles.cartItemPrice}>Rp {(product?.price || 0).toLocaleString('id-ID')}</Text>
        </View>
        <View style={styles.cartQtyRow}>
          <TouchableOpacity onPress={() => removeItem(item.productId)} style={styles.qtyBtn}>
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => addItem(item.productId)} style={styles.qtyBtn}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cashier Terminal</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4B3621" />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.productsSection}>
            <FlatList
              data={products || []}
              renderItem={renderProduct}
              keyExtractor={(item: Product) => String(item.id)}
              numColumns={2}
              contentContainerStyle={styles.productGrid}
              columnWrapperStyle={styles.productRow}
            />
          </View>

          <View style={styles.cartSection}>
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>Current Order</Text>
              <Text style={styles.cartCount}>{items.length} items</Text>
            </View>

            <FlatList
              data={items}
              renderItem={renderCartItem}
              keyExtractor={(item) => String(item.productId)}
              style={styles.cartList}
              ListEmptyComponent={
                <View style={styles.emptyCart}>
                  <Text style={styles.emptyCartIcon}>🛒</Text>
                  <Text style={styles.emptyCartText}>Cart is empty</Text>
                </View>
              }
            />

            <View style={styles.summary}>
              {serviceCharge > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Service ({serviceCharge}%)</Text>
                  <Text style={styles.summaryValue}>Rp {serviceFee.toLocaleString('id-ID')}</Text>
                </View>
              )}
              {taxPercentage > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax ({taxPercentage}%)</Text>
                  <Text style={styles.summaryValue}>Rp {tax.toLocaleString('id-ID')}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>Rp {total.toLocaleString('id-ID')}</Text>
              </View>

              <View style={styles.paymentRow}>
                {['Cash', 'QRIS', 'Transfer'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.paymentChip, paymentMethod === method && styles.paymentChipActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.paymentChipText, paymentMethod === method && styles.paymentChipTextActive]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.checkoutBtn, (items.length === 0 || isProcessing) && styles.checkoutBtnDisabled]}
                onPress={handleCheckout}
                disabled={items.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.checkoutText}>CHARGE PAYMENT</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#4B3621' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, flexDirection: 'column' },
  productsSection: { flex: 1 },
  productGrid: { padding: 12 },
  productRow: { justifyContent: 'space-between' },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productIcon: { fontSize: 32, marginBottom: 8 },
  productName: { fontSize: 13, fontWeight: '600', color: '#1A1109', textAlign: 'center', marginBottom: 4 },
  productPrice: { fontSize: 12, fontWeight: '700', color: '#4B3621' },
  productStock: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  cartSection: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', maxHeight: '45%' },
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#4B3621' },
  cartTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  cartCount: { color: '#D4A373', fontSize: 14 },
  cartList: { maxHeight: 160 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cartItemName: { fontSize: 14, fontWeight: '500', color: '#1A1109' },
  cartItemPrice: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cartQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#4B3621' },
  qtyText: { fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  emptyCart: { alignItems: 'center', padding: 24 },
  emptyCartIcon: { fontSize: 32 },
  emptyCartText: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  summary: { padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: 13, color: '#6B7280' },
  summaryValue: { fontSize: 13, color: '#6B7280' },
  totalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1A1109' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#4B3621' },
  paymentRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  paymentChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  paymentChipActive: { backgroundColor: '#4B3621', borderColor: '#4B3621' },
  paymentChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  paymentChipTextActive: { color: '#FFFFFF' },
  checkoutBtn: { backgroundColor: '#4B3621', padding: 14, borderRadius: 10, alignItems: 'center' },
  checkoutBtnDisabled: { opacity: 0.4 },
  checkoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
})
