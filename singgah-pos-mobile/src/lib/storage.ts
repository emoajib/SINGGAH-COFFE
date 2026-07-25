import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Robust web detection
const isWeb = Platform.OS === 'web' || typeof window !== 'undefined'

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) {
      try {
        return localStorage.getItem(key)
      } catch (e) {
        console.error('localStorage access denied', e)
        return null
      }
    }
    
    try {
      return await SecureStore.getItemAsync(key)
    } catch (err) {
      console.warn('SecureStore getItem error:', err)
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      try {
        localStorage.setItem(key, value)
      } catch (e) {
        console.error('localStorage setItem failed', e)
      }
      return
    }

    try {
      await SecureStore.setItemAsync(key, value)
    } catch (err) {
      console.warn('SecureStore setItem error:', err)
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (isWeb) {
      try {
        localStorage.removeItem(key)
      } catch (e) {
        console.error('localStorage removeItem failed', e)
      }
      return
    }

    try {
      await SecureStore.deleteItemAsync(key)
    } catch (err) {
      console.warn('SecureStore deleteItem error:', err)
    }
  }
}
