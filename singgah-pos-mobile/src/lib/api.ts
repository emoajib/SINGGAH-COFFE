import axios from 'axios'
import { Platform } from 'react-native'
import { storage } from './storage'

const TOKEN_KEY = 'jwt_token'

// On web, we might want to use the same host as the dashboard
const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL
  
  if (Platform.OS === 'web') {
    return 'http://localhost:8080/api'
  }
  
  // For android emulator
  return 'http://10.0.2.2:8080/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await storage.getItem(TOKEN_KEY)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (err) {
    console.error('Auth interceptor error:', err)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.deleteItem(TOKEN_KEY)
    }
    return Promise.reject(error)
  },
)

export { TOKEN_KEY }
export default api
