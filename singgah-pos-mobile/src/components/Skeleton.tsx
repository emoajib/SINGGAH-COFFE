import { View, StyleSheet } from 'react-native'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: any
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 6, style }: SkeletonProps) {
  return <View style={[styles.skeleton, { width: width as any, height, borderRadius }, style]} />
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: '#E5E7EB', opacity: 0.7 },
})
