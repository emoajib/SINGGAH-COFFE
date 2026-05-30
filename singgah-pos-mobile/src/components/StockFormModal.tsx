import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert } from 'react-native'
import { useUpdateStock } from '../../src/hooks/useIngredients'
import type { Ingredient } from '../../src/types'

interface StockFormProps {
  visible: boolean
  onClose: () => void
  ingredient?: Ingredient | null
}

export default function StockFormModal({ visible, onClose, ingredient }: StockFormProps) {
  const [quantity, setQuantity] = useState('')
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJ_ADD' | 'ADJ_SUB'>('IN')
  const [notes, setNotes] = useState('')

  const updateStock = useUpdateStock()
  const isSaving = updateStock.isPending

  const handleSave = async () => {
    if (!quantity || !ingredient) {
      Alert.alert('Error', 'Quantity required')
      return
    }

    try {
      await updateStock.mutateAsync({
        ingredient_id: ingredient.id,
        type,
        quantity: parseFloat(quantity),
        notes,
      })
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to update stock')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Update Stock: {ingredient?.name}</Text>
          <TextInput style={styles.input} placeholder="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          <View style={styles.typeRow}>
            {(['IN', 'OUT', 'ADJ_ADD', 'ADJ_SUB'] as const).map((t) => (
              <TouchableOpacity key={t} style={[styles.typeBtn, type === t && styles.typeBtnActive]} onPress={() => setType(t)}>
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={[styles.input, styles.textarea]} placeholder="Notes" value={notes} onChangeText={setNotes} multiline />
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
  modal: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, width: '90%' },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14 },
  textarea: { height: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, padding: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#4B3621', borderColor: '#4B3621' },
  typeText: { fontSize: 12, color: '#6B7280' },
  typeTextActive: { color: '#FFFFFF' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  cancelBtn: { padding: 12, flex: 1, alignItems: 'center' },
  saveBtn: { backgroundColor: '#4B3621', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '600' },
})