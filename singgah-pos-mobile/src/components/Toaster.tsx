import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToastStore, type ToastVariant } from '../stores/toastStore'

const bgColors: Record<ToastVariant, string> = {
  success: '#065F46',
  error: '#991B1B',
  info: '#1E40AF',
}

const iconMap: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export default function Toaster() {
  const insets = useSafeAreaInsets()
  const { toasts, dismissToast } = useToastStore()

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
      ))}
    </View>
  )
}

function ToastItem({ toast, onDismiss }: { toast: { message: string; variant: ToastVariant }; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start()

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(onDismiss)
    }, 2800)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bgColors[toast.variant], opacity, transform: [{ translateY }] },
      ]}
    >
      <TouchableOpacity onPress={onDismiss} style={styles.toastContent}>
        <Text style={styles.toastIcon}>{iconMap[toast.variant]}</Text>
        <Text style={styles.toastMessage}>{toast.message}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, zIndex: 9999 },
  toast: { borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  toastContent: { flexDirection: 'row', alignItems: 'center' },
  toastIcon: { fontSize: 16, color: '#FFFFFF', marginRight: 10, fontWeight: 'bold' },
  toastMessage: { fontSize: 14, color: '#FFFFFF', fontWeight: '500', flex: 1 },
})
