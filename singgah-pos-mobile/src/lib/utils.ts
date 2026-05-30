import { Platform } from 'react-native'

const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL
  
  if (Platform.OS === 'web') {
    return 'http://localhost:8080/api'
  }
  
  // For android emulator
  return 'http://10.0.2.2:8080/api'
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatCurrency(value: number): string {
  return `Rp ${formatNumber(value)}`
}

const API_BASE = getBaseURL().replace(/\/api$/, '')

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${API_BASE}${path}`
}
