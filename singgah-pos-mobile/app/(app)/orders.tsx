import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOrders, useVoidOrder } from '../../src/hooks/useOrders'
import { useToastStore } from '../../src/stores/toastStore'
import type { Order } from '../../src/types'
import OrderCardSkeleton from '../../src/components/OrderCardSkeleton'
import { formatNumber } from '../../src/lib/utils'

export default function OrdersScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data: orders, isLoading, refetch, isRefetching } = useOrders()
  const voidOrder = useVoidOrder()
  const { showToast } = useToastStore()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [voidingId, setVoidingId] = useState<number | null>(null)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const formatCurrency = (amount: number) => {
    return `Rp ${formatNumber(amount)}`
  }

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'completed') return { bg: '#D1FAE5', text: '#065F46' }
    if (s === 'pending' || s === 'processing') return { bg: '#FEF3C7', text: '#92400E' }
    return { bg: '#FEE2E2', text: '#991B1B' }
  }

  const handleVoid = async (order: Order) => {
    setVoidingId(order.id)
    try {
      await voidOrder.mutateAsync(order.id)
      showToast('Transaction voided successfully', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to void transaction', 'error')
    } finally {
      setVoidingId(null)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const renderOrder = ({ item }: { item: Order }) => {
    const isExpanded = expandedId === item.id
    const isVoiding = voidingId === item.id
    const statusStyle = getStatusStyle(item.status)
    const isVoided = item.status.toLowerCase() === 'cancelled' || item.status.toLowerCase() === 'void'

    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => toggleExpand(item.id)} activeOpacity={0.7}>
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.orderNumberRow}>
              <Text style={styles.orderNumber}>{item.order_number}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cashier</Text>
            <Text style={styles.detailValue}>{item.cashier_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment</Text>
            <Text style={styles.detailValue}>{item.payment_method}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Items</Text>
            <Text style={styles.detailValue}>{item.items?.length || 0}</Text>
          </View>
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(item.total_amount)}</Text>
          </View>
        </View>

        {isExpanded && item.items && item.items.length > 0 && (
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsTitle}>Order Items</Text>
            {item.items.map((oi) => (
              <View key={oi.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>{oi.product_name}</Text>
                <Text style={styles.itemQty}>x{oi.quantity}</Text>
                <Text style={styles.itemPrice}>{formatCurrency(oi.subtotal)}</Text>
              </View>
            ))}
          </View>
        )}

        {!isVoided && (
          <TouchableOpacity
            style={[styles.voidBtn, isVoiding && styles.voidBtnDisabled]}
            onPress={() => handleVoid(item)}
            disabled={isVoiding}
          >
            {isVoiding ? (
              <ActivityIndicator color="#EF4444" size="small" />
            ) : (
              <Text style={styles.voidBtnText}>Void Transaction</Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(app)/dashboard')
    }
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Orders History</Text>
        <View style={{ width: 60 }} />
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => <OrderCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={orders || []}
          renderItem={renderOrder}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4B3621" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No orders yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#4B3621' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  list: { padding: 16 },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderNumber: { fontSize: 15, fontWeight: '700', color: '#1A1109' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  orderDetails: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  totalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1A1109' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#4B3621' },
  itemsContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8 },
  itemsTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  itemName: { flex: 1, fontSize: 13, color: '#374151' },
  itemQty: { fontSize: 13, color: '#6B7280', marginRight: 16, width: 30, textAlign: 'center' },
  itemPrice: { fontSize: 13, fontWeight: '600', color: '#4B3621', width: 100, textAlign: 'right' },
  voidBtn: { marginTop: 12, alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  voidBtnDisabled: { opacity: 0.5 },
  voidBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 13 },
})
