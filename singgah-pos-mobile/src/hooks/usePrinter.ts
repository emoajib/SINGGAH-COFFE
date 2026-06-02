import { useState, useEffect, useCallback } from 'react'
import * as SecureStore from 'expo-secure-store'
import { printerService, ReceiptData } from '../services/printerService'

const PRINTER_IP_KEY = 'printer_ip'

export default function usePrinter() {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Try to reconnect on mount using stored IP
  useEffect(() => {
    ;(async () => {
      try {
        const storedIp = await SecureStore.getItemAsync(PRINTER_IP_KEY)
        if (storedIp) {
          setIsConnected(true)
        }
      } catch {
        // No stored IP — not an error
      }
    })()
  }, [])

  const connect = useCallback(async (ipAddress: string) => {
    setIsConnecting(true)
    setError(null)
    try {
      await SecureStore.setItemAsync(PRINTER_IP_KEY, ipAddress)
      setIsConnected(true)
    } catch (e: any) {
      const message = e?.message || 'Failed to connect to printer'
      setError(message)
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(PRINTER_IP_KEY)
    } catch {
      // Ignore delete errors
    }
    setIsConnected(false)
    setError(null)
  }, [])

  const printReceipt = useCallback(async (data: ReceiptData) => {
    setError(null)
    try {
      const ipAddress = await SecureStore.getItemAsync(PRINTER_IP_KEY)
      if (!ipAddress) {
        throw new Error('No printer connected. Please connect to a printer first.')
      }

      const printerSettings = {
        printer_connection: 'network' as const,
        printer_ip: ipAddress,
        printer_width: '80mm' as const,
        auto_print: 'true',
      }

      await printerService.printReceipt(printerSettings, data)
    } catch (e: any) {
      const message = e?.message || 'Failed to print receipt'
      setError(message)
      throw e
    }
  }, [])

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    printReceipt,
  }
}
