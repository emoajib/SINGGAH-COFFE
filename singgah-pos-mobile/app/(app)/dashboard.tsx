import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/stores/authStore'

const modules = [
  { key: 'pos', title: 'New Order', icon: '🛒', roles: ['owner', 'manager', 'cashier'] as const },
  { key: 'orders', title: 'Orders History', icon: '📋', roles: ['owner', 'manager', 'cashier'] as const },
  { key: 'ingredients', title: 'Inventory', icon: '📦', roles: ['owner', 'manager'] as const },
  { key: 'sop', title: 'SOP Guide', icon: '📜', roles: ['owner', 'manager', 'cashier'] as const },
  { key: 'settings', title: 'Settings', icon: '⚙️', roles: ['owner', 'manager', 'cashier'] as const },
  { key: 'reports', title: 'Reports', icon: '📊', roles: ['owner'] as const },
]

export default function DashboardScreen() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const role = user?.role || 'cashier'

  const handleModulePress = (key: string) => {
    if (key === 'pos') {
      router.push('/(app)/pos')
    } else if (key === 'orders') {
      router.push('/(app)/orders')
    } else if (key === 'ingredients') {
      router.push('/(app)/ingredients')
    } else if (key === 'sop') {
      router.push('/(app)/sop')
    } else if (key === 'settings') {
      router.push('/(app)/settings')
    } else if (key === 'reports') {
      Alert.alert(
        "Gunakan Dashboard Web",
        "Laporan detail dan ekspor akuntansi saat ini hanya tersedia melalui Dashboard Web untuk tampilan yang lebih maksimal.",
        [{ text: "OK" }]
      )
    }
  }

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, {user?.name || 'Staff'}!</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{role.toUpperCase()}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Select a module to begin:</Text>

      <ScrollView contentContainerStyle={styles.grid}>
        {modules
          .filter((m) => m.roles.includes(role as any))
          .map((module) => (
            <TouchableOpacity
              key={module.key}
              style={styles.card}
              onPress={() => handleModulePress(module.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardIcon}>{module.icon}</Text>
              <Text style={styles.cardTitle}>{module.title}</Text>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E6', paddingTop: 60, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#4B3621' },
  roleBadge: {
    backgroundColor: '#EDE0D0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleText: { fontSize: 11, fontWeight: '700', color: '#4B3621', letterSpacing: 1 },
  logoutBtn: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: { fontSize: 40 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#4B3621', marginTop: 12, textAlign: 'center' },
})
