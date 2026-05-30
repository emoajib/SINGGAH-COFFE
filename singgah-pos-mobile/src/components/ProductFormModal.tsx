import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import { useCreateProduct, useUpdateProduct } from '../../src/hooks/useProducts'
import type { Product } from '../../src/types'

interface ProductFormProps {
  visible: boolean
  onClose: () => void
  product?: Product | null
}

export default function ProductFormModal({ visible, onClose, product }: ProductFormProps) {
  const [name, setName] = useState(product?.name || '')
  const [category, setCategory] = useState(product?.category || '')
  const [price, setPrice] = useState(String(product?.price || ''))
  const [cost, setCost] = useState(String(product?.cost || ''))
  const [sku, setSku] = useState(product?.sku || '')
  const [stock, setStock] = useState(String(product?.stock || ''))

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const isSaving = createProduct.isPending || updateProduct.isPending

  const handleSave = async () => {
    if (!name || !category || !price || !cost || !sku) {
      Alert.alert('Error', 'All fields required')
      return
    }

    try {
      const data = {
        name,
        category,
        price: parseFloat(price),
        cost: parseFloat(cost),
        sku,
        image_url: product?.image_url || '',
        description: product?.description || '',
        recipe: [],
      }

      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...data })
      } else {
        await createProduct.mutateAsync(data)
      }
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to save product')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{product ? 'Edit Product' : 'Add Product'}</Text>
          <ScrollView>
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
            <TextInput style={styles.input} placeholder="Price" value={price} onChangeText={setPrice} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Cost" value={cost} onChangeText={setCost} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="SKU" value={sku} onChangeText={setSku} />
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSaving}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, width: '90%', maxHeight: '80%' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  cancelBtn: { padding: 12, flex: 1, alignItems: 'center' },
  saveBtn: { backgroundColor: '#4B3621', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '600' },
})