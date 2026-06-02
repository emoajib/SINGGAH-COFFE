import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { reportService } from '../../src/services/reportService'
import { useToastStore } from '../../src/stores/toastStore'
import { useAuthStore } from '../../src/stores/authStore'

export default function ReportsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useAuthStore()
  const { showToast } = useToastStore()
  
  const [reportData, setReportData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadReportData = async () => {
    setIsLoading(true)
    try {
      const [profitLoss, salesSummary] = await Promise.all([
        reportService.getProfitLoss(),
        reportService.getSalesSummary()
      ])
      
      setReportData({
        profitLoss,
        salesSummary
      })
      showToast('Reports loaded successfully', 'success')
    } catch (error) {
      showToast('Failed to load reports', 'error')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [])

  const handleRefresh = () => {
    loadReportData()
  }

  if (!user) {
    router.replace('/(auth)/login')
    return null
  }

  if (isLoading && !reportData) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4B3621" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
      </View>

      {isRefreshing && !reportData ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#4B3621" />
        </View>
      ) : (
        <FlatList
          data={[
            { title: 'Profit & Loss', icon: '💰', data: reportData?.profitLoss },
            { title: 'Sales Summary', icon: '📊', data: reportData?.salesSummary }
          ]}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.icon} {item.title}</Text>
              </View>
              <View style={styles.cardBody}>
                {item.title === 'Profit & Loss' && item.data ? (
                  <>
                    <Text style={styles.label}>Revenue:</Text>
                    <Text style={styles.value}>Rp {item.data.revenue.toLocaleString('id-ID')}</Text>
                    <Text style={styles.label}>COGS:</Text>
                    <Text style={styles.value}>Rp {item.data.cogs.toLocaleString('id-ID')}</Text>
                    <Text style={styles.label}>Gross Profit:</Text>
                    <Text style={styles.value}>Rp {item.data.grossProfit.toLocaleString('id-ID')}</Text>
                    <Text style={styles.label}>Gross Margin:</Text>
                    <Text style={styles.value}>{item.data.grossProfitMargin.toFixed(1)}%</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Total Sales:</Text>
                    <Text style={styles.value}>Rp {item.data?.totalSales?.toLocaleString('id-ID') || 0}</Text>
                    <Text style={styles.label}>Total Orders:</Text>
                    <Text style={styles.value}>{item.data?.totalOrders || 0}</Text>
                    <Text style={styles.label}>Avg Order Value:</Text>
                    <Text style={styles.value}>Rp {item.data?.averageOrderValue?.toLocaleString('id-ID') || 0}</Text>
                    {item.data?.topProducts && item.data.topProducts.length > 0 ? (
                      <>
                        <Text style={styles.labelTop}>Top Products:</Text>
                        <FlatList
                          data={item.data.topProducts}
                          keyExtractor={(item, index) => index.toString()}
                          renderItem={({ item }) => (
                            <View style={styles.productItem}>
                              <Text style={styles.productText}>{item.name}</Text>
                              <Text style={styles.productText}>Qty: {item.quantity} | Rev: Rp {item.revenue.toLocaleString('id-ID')}</Text>
                            </View>
                          )}
                          contentContainerStyle={styles.productList}
                        />
                      </>
                    ) : null}
                  </>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#4B3621" />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>No report data available</Text>
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
  back: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#4B3621' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1109' },
  cardBody: { paddingTop: 12 },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '600', color: '#1A1109', marginBottom: 8 },
  labelTop: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginTop: 12, marginBottom: 8 },
  productItem: { padding: 8, backgroundColor: '#F9FAFB', borderRadius: 6, marginVertical: 4 },
  productText: { fontSize: 13, color: '#4B3621' },
  productList: { padding: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#6B7280' },
})