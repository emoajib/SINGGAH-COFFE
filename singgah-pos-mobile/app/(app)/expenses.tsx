import { useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useExpenses, useDeleteExpense } from '../../src/hooks/useExpenses'
import { useToastStore } from '../../src/stores/toastStore'
import { useAuthStore } from '../../src/stores/authStore'
import type { Expense } from '../../src/types'
import ExpenseFormModal from '../../src/components/ExpenseFormModal'
import { formatNumber } from '../../src/lib/utils'

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data: expenses, isLoading, refetch, isRefetching } = useExpenses()
  const deleteExpense = useDeleteExpense()
  const { showToast } = useToastStore()
  const { user } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const canEdit = user?.role === 'owner' || user?.role === 'manager'

  const formatCurrency = (amount: number) => `Rp ${formatNumber(amount)}`
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleDelete = (expense: Expense) => {
    deleteExpense.mutateAsync(expense.id).then(() => {
      showToast('Expense deleted successfully', 'success')
    }).catch(() => {
      showToast('Failed to delete expense', 'error')
    })
  }

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.expenseTitle}>{item.title}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
        {canEdit && (
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Expenses</Text>
        {canEdit && (
          <TouchableOpacity onPress={() => setShowForm(true)}><Text style={styles.addBtn}>+ Add</Text></TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4B3621" /></View>
      ) : (
        <FlatList
          data={expenses || []}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4B3621" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No expenses recorded</Text>
            </View>
          }
        />
      )}
      <ExpenseFormModal visible={showForm} onClose={() => setShowForm(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E6' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#4B3621' },
  addBtn: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  list: { padding: 16 },
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
  expenseTitle: { fontSize: 16, fontWeight: '700', color: '#1A1109' },
  categoryBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  amount: { fontSize: 18, fontWeight: '700', color: '#EF4444' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  date: { fontSize: 12, color: '#9CA3AF' },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FEF2F2' },
  deleteText: { color: '#EF4444', fontWeight: '600', fontSize: 12 },
})
