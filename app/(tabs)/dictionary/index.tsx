import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';

export default function DictionaryScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dictionary</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search words, kanji, or English…"
        placeholderTextColor="#6B6B80"
      />
      <Text style={styles.hint}>Database not yet loaded — results will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F14', padding: 16, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#F4F4F8', marginBottom: 16 },
  input: {
    backgroundColor: '#1A1A24',
    borderWidth: 1,
    borderColor: '#2E2E3A',
    borderRadius: 10,
    padding: 12,
    color: '#F4F4F8',
    fontSize: 17,
  },
  hint: { marginTop: 24, color: '#6B6B80', fontSize: 15, textAlign: 'center' },
});
