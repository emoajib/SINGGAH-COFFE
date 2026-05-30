import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native'
import { useCreateExpense } from '../../src/hooks/useExpenses'

interface ExpenseFormProps {
  visible: boolean
  onClose: () => void
}

export default function ExpenseFormModal({ visible, onClose }: ExpenseFormProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')

  const createExpense = useCreateExpense()
  const isSaving = createExpense.isPending

  const handleSave = async () => {
    if (!title || !amount || !category) {
      Alert.alert('Error', 'Title, amount, and category required')
      return
    }

    try {
      await createExpense.mutateAsync({
        title,
        amount: parseFloat(amount),
        category,
        date,
        description,
      })
      onClose()
    } catch {
      Alert.alert('Error', 'Failed to create expense')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Add Expense</Text>
          <ScrollView>
            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
            <TextInput style={[styles.input, styles.textarea]} placeholder="Description" value={description} onChangeText={setDescription} multiline />
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
  textarea: { height: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  cancelBtn: { padding: 12, flex: 1, alignItems: 'center' },
  saveBtn: { backgroundColor: '#4B3621', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '600' },
})