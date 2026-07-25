import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettings } from '../../src/hooks/useSettings'
import { useAuthStore } from '../../src/stores/authStore'

export default function SopScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: settings, isLoading } = useSettings()

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(app)/dashboard')
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4B3621" />
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Standard Operating Procedures</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Panduan resmi operasional Singgah Coffee. Harap baca dan patuhi untuk menjaga kualitas layanan.
          </Text>
        </View>

        {(user?.role === 'owner' || user?.role === 'manager') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🛡️</Text>
              <Text style={styles.sectionTitle}>Manager SOP</Text>
            </View>
            <View style={styles.sopBox}>
              <Text style={styles.sopText}>
                {settings?.sop_manager || "Belum ada SOP yang diatur oleh Owner."}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>☕</Text>
            <Text style={styles.sectionTitle}>Kasir & Barista SOP</Text>
          </View>
          <View style={styles.sopBox}>
            <Text style={styles.sopText}>
              {settings?.sop_cashier || "Belum ada SOP yang diatur oleh Owner."}
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Pembaruan Terakhir: {new Date().toLocaleDateString('id-ID')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E6' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  back: { fontSize: 16, color: '#4B3621', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#4B3621' },
  content: { padding: 20 },
  infoBox: {
    backgroundColor: '#4B3621',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: { color: '#FFFFFF', fontSize: 12, lineHeight: 18, fontStyle: 'italic', opacity: 0.9 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#4B3621', textTransform: 'uppercase', letterSpacing: 1 },
  sopBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  sopText: { fontSize: 14, color: '#1A1109', lineHeight: 22, fontFamily: 'monospace' },
  footer: { marginTop: 20, alignItems: 'center', paddingBottom: 40 },
  footerText: { fontSize: 10, color: '#9CA3AF', fontWeight: 'bold' },
})
