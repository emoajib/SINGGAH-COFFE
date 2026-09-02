import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    const config = error.config as CustomAxiosRequestConfig | undefined

    // Handle 429 Too Many Requests with backoff retry (up to 3 times)
    if (error.response?.status === 429 && config && (config._retryCount || 0) < 3) {
      config._retryCount = (config._retryCount || 0) + 1
      const retryAfterHeader = error.response.headers?.['retry-after']
      let delayMs = 1000 * Math.pow(2, config._retryCount - 1)
      if (retryAfterHeader) {
        const seconds = parseInt(retryAfterHeader, 10)
        if (!isNaN(seconds) && seconds > 0) {
          delayMs = Math.min(seconds * 1000, 10000)
        }
      }
      delayMs += Math.floor(Math.random() * 200)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      return api(config)
    }

    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
