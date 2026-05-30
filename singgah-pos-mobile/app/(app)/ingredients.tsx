import { useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIngredients } from '../../src/hooks/useIngredients'
import { useAuthStore } from '../../src/stores/authStore'
import type { Ingredient } from '../../src/types'
import { Skeleton } from '../../src/components/Skeleton'
import StockFormModal from '../../src/components/StockFormModal'

export default function IngredientsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data: ingredients, isLoading, refetch, isRefetching } = useIngredients()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [showStockForm, setShowStockForm] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const canEdit = user?.role === 'owner' || user?.role === 'manager'

  const filtered = (ingredients || []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  const getStockStatus = (item: Ingredient) => {
    if (item.current_stock <= item.min_stock) return { color: '#EF4444', bg: '#FEF2F2', label: 'Low Stock' }
    if (item.current_stock <= item.min_stock * 2) return { color: '#F59E0B', bg: '#FFFBEB', label: 'Warning' }
    return { color: '#10B981', bg: '#ECFDF5', label: 'In Stock' }
  }

  const renderItem = ({ item }: { item: Ingredient }) => {
    const status = getStockStatus(item)
    return (
      <TouchableOpacity style={styles.card} onPress={() => { setSelectedIngredient(item); setShowStockForm(true) }}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Stock</Text>
            <Text style={[styles.statValue, { color: status.color }]}>{item.current_stock} {item.unit}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Min Stock</Text>
            <Text style={styles.statValue}>{item.min_stock} {item.unit}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Cost/Unit</Text>
            <Text style={styles.statValue}>Rp {item.cost_per_unit.toLocaleString('id-ID')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Inventory</Text>
        <View style={{ width: 60 }} />
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search ingredients..."
        placeholderTextColor="#9CA3AF"
        value={search}
        onChangeText={setSearch}
      />

      {isLoading ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardHeader}>
                <Skeleton width="60%" height={18} />
                <Skeleton width={80} height={22} borderRadius={8} />
              </View>
              <View style={styles.cardBody}>
                <Skeleton width={60} height={14} />
                <Skeleton width={60} height={14} />
                <Skeleton width={80} height={14} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4B3621" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>{search ? 'No ingredients match your search' : 'No ingredients yet'}</Text>
            </View>
          }
        />
      )}
      <StockFormModal visible={showStockForm} onClose={() => setShowStockForm(false)} ingredient={selectedIngredient} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#4B3621' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#1A1109', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardBody: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 24 },
  stat: {},
  statLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1A1109' },
})
