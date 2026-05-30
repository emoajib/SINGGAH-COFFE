import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useAuthStore } from '../../src/stores/authStore'

export default function AppLayout() {
  const { user, isInitializing } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (isInitializing) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (user && inAuthGroup) {
      router.replace('/(app)/dashboard')
    }
  }, [user, isInitializing])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="pos" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="orders" />
      <Stack.Screen name="products" />
      <Stack.Screen name="ingredients" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="index" />
    </Stack>
  )
}
