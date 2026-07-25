import React, { useState } from 'react'
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
  StyleSheet,
} from 'react-native'
import usePrinter from '../hooks/usePrinter'
import type { ReceiptData } from '../services/printerService'

interface PrintButtonProps {
  receiptData: ReceiptData
}

export default function PrintButton({ receiptData }: PrintButtonProps) {
  const { isConnected, isConnecting, error, connect, disconnect, printReceipt } = usePrinter()
  const [isPrinting, setIsPrinting] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [ipInput, setIpInput] = useState('')

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      await printReceipt(receiptData)
      Alert.alert('Success', 'Receipt printed successfully')
    } catch (e: any) {
      Alert.alert('Print Failed', e?.message || 'Failed to print receipt')
    } finally {
      setIsPrinting(false)
    }
  }

  const handleConnectPress = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Connect Printer',
        'Enter printer IP address:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect',
            onPress: async (ip?: string) => {
              if (ip && ip.trim()) {
                await connect(ip.trim())
              }
            },
          },
        ],
        'plain-text',
        '',
        'numeric'
      )
    } else {
      setIpInput('')
      setShowPrompt(true)
    }
  }

  const handleAndroidConnect = async () => {
    if (ipInput.trim()) {
      await connect(ipInput.trim())
      setShowPrompt(false)
      setIpInput('')
    }
  }

  if (isPrinting) {
    return (
      <View style={[styles.button, styles.printingButton]}>
        <ActivityIndicator color="#FFFFFF" size="small" />
        <Text style={styles.buttonText}>Printing...</Text>
      </View>
    )
  }

  if (isConnected) {
    return (
      <View>
        <TouchableOpacity style={styles.button} onPress={handlePrint}>
          <Text style={styles.buttonText}>Print Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.disconnectBtn} onPress={disconnect}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.button, styles.connectButton]}
        onPress={handleConnectPress}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Connect Printer</Text>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Android custom prompt */}
      <Modal visible={showPrompt} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Connect Printer</Text>
            <Text style={styles.modalSubtitle}>Enter printer IP address:</Text>
            <TextInput
              style={styles.ipInput}
              placeholder="192.168.1.100"
              value={ipInput}
              onChangeText={setIpInput}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowPrompt(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={handleAndroidConnect}
              >
                <Text style={styles.connectBtnText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4B3621',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  printingButton: {
    opacity: 0.7,
  },
  connectButton: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  disconnectBtn: {
    padding: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  disconnectText: {
    color: '#6B7280',
    fontSize: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1109',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  ipInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  connectBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#4B3621',
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
