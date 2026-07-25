import React from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { getImageUrl, formatNumber } from '../../lib/utils'
import type { Product } from '../../types'

interface ReceiptProps {
  orderNumber: string
  items: { productId: number; quantity: number }[]
  products: Product[]
  subtotal: number
  tax: number
  serviceFee: number
  total: number
  paymentMethod: string
  cashierName: string
  outletName?: string
  outletAddress?: string
  logoUrl?: string
}

export default function Receipt({
  orderNumber,
  items,
  products,
  subtotal,
  tax,
  serviceFee,
  total,
  paymentMethod,
  cashierName,
  outletName = "Singgah Coffee",
  outletAddress = "Jl. Example No. 123, Jakarta",
  logoUrl
}: ReceiptProps) {
  const now = new Date().toLocaleString('id-ID')
  const finalLogoUrl = getImageUrl(logoUrl)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {logoUrl ? (
          <Image 
            source={{ uri: finalLogoUrl }} 
            style={styles.logo} 
            resizeMode="contain"
          />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>S</Text>
          </View>
        )}
        <Text style={styles.title}>{outletName}</Text>
        <Text style={styles.subtitle}>{outletAddress}</Text>
        <Text style={styles.divider}>--------------------------------</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.row}>
          <Text style={styles.text}>Date:</Text>
          <Text style={styles.text}>{now}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.text}>Order:</Text>
          <Text style={styles.text}>{orderNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.text}>Cashier:</Text>
          <Text style={styles.text}>{cashierName}</Text>
        </View>
        <Text style={styles.divider}>--------------------------------</Text>
      </View>

      <View style={styles.itemsSection}>
        {items.map((item, idx) => {
          const product = products.find(p => p.id === item.productId)
          return (
            <View key={idx} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{product?.name || 'Unknown'}</Text>
                <Text style={styles.itemDetail}>
                  {item.quantity} x {formatNumber(product?.price || 0)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {formatNumber((product?.price || 0) * item.quantity)}
              </Text>
            </View>
          )
        })}
        <Text style={styles.divider}>--------------------------------</Text>
      </View>

      <View style={styles.summarySection}>
        <View style={styles.row}>
          <Text style={styles.text}>Subtotal:</Text>
          <Text style={styles.text}>{formatNumber(subtotal)}</Text>
        </View>
        {serviceFee > 0 && (
          <View style={styles.row}>
            <Text style={styles.text}>Service Charge:</Text>
            <Text style={styles.text}>{formatNumber(serviceFee)}</Text>
          </View>
        )}
        {tax > 0 && (
          <View style={styles.row}>
            <Text style={styles.text}>PB1 (Tax):</Text>
            <Text style={styles.text}>{formatNumber(tax)}</Text>
          </View>
        )}
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={styles.boldText}>TOTAL:</Text>
          <Text style={styles.boldText}>Rp {formatNumber(total)}</Text>
        </View>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={styles.text}>Payment:</Text>
          <Text style={styles.text}>{paymentMethod.toUpperCase()}</Text>
        </View>
        <Text style={styles.divider}>--------------------------------</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Thank you for visiting!</Text>
        <Text style={styles.footerText}>Singgah & Enjoy your coffee.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    width: 300, // Fixed width for thermal preview
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 8,
    borderRadius: 12,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: '#8b4513',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#000000',
  },
  subtitle: {
    fontSize: 10,
    color: '#000000',
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 8,
  },
  itemsSection: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  itemDetail: {
    fontSize: 10,
    color: '#666666',
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  summarySection: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  text: {
    fontSize: 11,
    color: '#000000',
  },
  boldText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#000000',
  },
  divider: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 4,
    color: '#000000',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#000000',
  },
})
