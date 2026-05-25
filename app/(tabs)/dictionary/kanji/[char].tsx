import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function KanjiDetailScreen() {
  const { char } = useLocalSearchParams<{ char: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.kanji}>{char}</Text>
      <Text style={styles.hint}>Kanji detail will display here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F14', padding: 16, paddingTop: 60 },
  back: { marginBottom: 16 },
  backText: { color: '#8B5CF6', fontSize: 17 },
  kanji: { fontSize: 72, color: '#F4F4F8', textAlign: 'center', marginVertical: 24 },
  hint: { color: '#6B6B80', fontSize: 15, textAlign: 'center' },
});
