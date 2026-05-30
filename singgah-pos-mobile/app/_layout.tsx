import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '../src/stores/authStore'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toaster from '../src/components/Toaster'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      retry: 1,
    },
  },
})

function RootLayoutContent() {
  const { isInitializing, init } = useAuthStore()

  useEffect(() => {
    init()
  }, [])

  if (isInitializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashIcon}>☕</Text>
        <Text style={styles.splashTitle}>Singgah Coffee POS</Text>
        <ActivityIndicator size="large" color="#D4A373" style={{ marginTop: 16 }} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <Toaster />
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootLayoutContent />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F0E6',
  },
  splashIcon: {
    fontSize: 64,
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B3621',
    marginTop: 16,
  },
})
