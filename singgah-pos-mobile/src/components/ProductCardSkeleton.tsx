import { View, StyleSheet } from 'react-native'
import { Skeleton } from './Skeleton'

export default function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={80} borderRadius={8} />
      <Skeleton width="80%" height={14} style={{ marginTop: 10 }} />
      <Skeleton width="50%" height={12} style={{ marginTop: 6 }} />
      <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 12, width: '48%' },
})
