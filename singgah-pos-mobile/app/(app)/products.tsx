import { useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useProducts, useDeleteProduct } from '../../src/hooks/useProducts'
import { useAuthStore } from '../../src/stores/authStore'
import { useToastStore } from '../../src/stores/toastStore'
import type { Product } from '../../src/types'
import ProductCardSkeleton from '../../src/components/ProductCardSkeleton'
import ProductFormModal from '../../src/components/ProductFormModal'

export default function ProductsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data: products, isLoading, refetch, isRefetching } = useProducts()
  const deleteProduct = useDeleteProduct()
  const { user } = useAuthStore()
  const { showToast } = useToastStore()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const canEdit = user?.role === 'owner' || user?.role === 'manager'

  const filtered = (products || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`

  const handleDelete = (item: Product) => {
    deleteProduct.mutateAsync(item.id).then(() => {
      showToast('Product deleted', 'success')
    }).catch(() => {
      showToast('Failed to delete', 'error')
    })
  }

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
        <Text style={styles.stockText}>Stock: {item.stock}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.priceLabel}>Price</Text>
        <Text style={styles.priceValue}>{formatCurrency(item.price)}</Text>
        <Text style={styles.costLabel}>Cost</Text>
        <Text style={styles.costValue}>{formatCurrency(item.cost)}</Text>
      </View>
      {canEdit && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => { setEditingProduct(item); setShowForm(true) }}><Text style={styles.editBtn}>Edit</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item)}><Text style={styles.deleteBtn}>Delete</Text></TouchableOpacity>
        </View>
      )}
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Products</Text>
        {canEdit && (
          <TouchableOpacity onPress={() => { setEditingProduct(null); setShowForm(true) }}><Text style={styles.addBtn}>+ Add</Text></TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
      />

      {isLoading ? (
        <View style={[styles.list, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }]}>
          {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderProduct}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4B3621" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>{search ? 'No products match your search' : 'No products yet'}</Text>
            </View>
          }
        />
      )}
      <ProductFormModal visible={showForm} onClose={() => setShowForm(false)} product={editingProduct} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#4B3621' },
  addBtn: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  searchInput: { margin: 16, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, color: '#1A1109' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  list: { padding: 16, paddingTop: 0 },
  card: {
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 16, fontWeight: '700', color: '#1A1109', marginBottom: 4 },
  categoryBadge: { backgroundColor: '#EDE0D0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#4B3621' },
  stockText: { fontSize: 13, color: '#6B7280' },
  cardBody: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 24 },
  priceLabel: { fontSize: 12, color: '#9CA3AF' },
  priceValue: { fontSize: 15, fontWeight: '700', color: '#4B3621' },
  costLabel: { fontSize: 12, color: '#9CA3AF' },
  costValue: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 16 },
  editBtn: { color: '#4B3621', fontWeight: '600' },
  deleteBtn: { color: '#EF4444', fontWeight: '600' },
})
