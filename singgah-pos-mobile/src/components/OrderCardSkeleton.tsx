import { View, StyleSheet } from 'react-native'
import { Skeleton } from './Skeleton'

export default function OrderCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width="60%" height={18} />
        <Skeleton width={70} height={22} borderRadius={8} />
      </View>
      <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
      <View style={styles.divider} />
      <View style={styles.row}>
        <Skeleton width={80} height={14} />
        <Skeleton width={100} height={14} />
      </View>
      <View style={styles.row}>
        <Skeleton width={70} height={14} />
        <Skeleton width={90} height={14} />
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Skeleton width={60} height={16} />
        <Skeleton width={120} height={16} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
})
