import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { reportService } from '../../src/services/reportService'
import { useToastStore } from '../../src/stores/toastStore'
import { useAuthStore } from '../../src/stores/authStore'

interface ProfitLossData {
  revenue: number
  cogs: number
  grossProfit: number
  grossProfitMargin: number
  totalExpenses: number
  netProfit: number
}

interface SalesSummaryData {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
}

type ReportCardItem =
  | { title: 'Profit & Loss'; icon: string; data: ProfitLossData | undefined }
  | { title: 'Sales Summary'; icon: string; data: SalesSummaryData | undefined }

export default function ReportsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useAuthStore()
  const { showToast } = useToastStore()
  
  const [reportData, setReportData] = useState<{
    profitLoss: ProfitLossData
    salesSummary: SalesSummaryData
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadReportData = async () => {
    setIsLoading(true)
    try {
      const [profitLossResult, salesSummaryResult] = await Promise.all([
        reportService.getProfitLoss(),
        reportService.getSalesSummary()
      ])
      
      setReportData({
        profitLoss: {
          revenue: profitLossResult.revenue,
          cogs: profitLossResult.cogs,
          grossProfit: profitLossResult.grossProfit,
          grossProfitMargin: profitLossResult.grossProfitMargin,
          totalExpenses: 0,
          netProfit: 0,
        },
        salesSummary: salesSummaryResult,
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
            { title: 'Profit & Loss' as const, icon: '💰', data: reportData?.profitLoss },
            { title: 'Sales Summary' as const, icon: '📊', data: reportData?.salesSummary },
          ]}
          renderItem={({ item }: { item: ReportCardItem }) => {
            if (item.title === 'Profit & Loss' && item.data) {
              const pl = item.data as ProfitLossData
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.icon} {item.title}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.label}>Revenue:</Text>
                    <Text style={styles.value}>Rp {pl.revenue.toLocaleString('id-ID')}</Text>
                    <Text style={styles.label}>COGS:</Text>
                    <Text style={styles.value}>Rp {pl.cogs.toLocaleString('id-ID')}</Text>
                    <Text style={styles.label}>Gross Profit:</Text>
                    <Text style={styles.value}>Rp {pl.grossProfit.toLocaleString('id-ID')}</Text>
                    <Text style={styles.label}>Gross Margin:</Text>
                    <Text style={styles.value}>{pl.grossProfitMargin.toFixed(1)}%</Text>
                  </View>
                </View>
              )
            }
            const ss = item.data as SalesSummaryData | undefined
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.icon} {item.title}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.label}>Total Sales:</Text>
                  <Text style={styles.value}>Rp {ss?.totalSales?.toLocaleString('id-ID') || 0}</Text>
                  <Text style={styles.label}>Total Orders:</Text>
                  <Text style={styles.value}>{ss?.totalOrders || 0}</Text>
                  <Text style={styles.label}>Avg Order Value:</Text>
                  <Text style={styles.value}>Rp {ss?.averageOrderValue?.toLocaleString('id-ID') || 0}</Text>
                  {ss?.topProducts && ss.topProducts.length > 0 ? (
                    <>
                      <Text style={styles.labelTop}>Top Products:</Text>
                      <View style={styles.productList}>
                        {ss.topProducts.map((product: { name: string; quantity: number; revenue: number }, index: number) => (
                          <View key={index} style={styles.productItem}>
                            <Text style={styles.productText}>{product.name}</Text>
                            <Text style={styles.productText}>Qty: {product.quantity} | Rev: Rp {product.revenue.toLocaleString('id-ID')}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            )
          }}
          keyExtractor={(_item: ReportCardItem, index: number) => index.toString()}
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