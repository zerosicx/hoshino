import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function StudySessionScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← End Session</Text>
      </Pressable>
      <View style={styles.card}>
        <Text style={styles.cardText}>No cards due</Text>
        <Text style={styles.cardHint}>Add words to a list to start reviewing.</Text>
      </View>
      <View style={styles.ratingBar}>
        {(['Again', 'Hard', 'Good', 'Easy'] as const).map((label) => (
          <Pressable key={label} style={[styles.ratingBtn, styles[`rating${label}`]]}>
            <Text style={styles.ratingText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F14', padding: 16, paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#8B5CF6', fontSize: 17 },
  card: {
    flex: 1,
    backgroundColor: '#1A1A24',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginBottom: 24,
  },
  cardText: { fontSize: 24, fontWeight: '700', color: '#F4F4F8', marginBottom: 8 },
  cardHint: { fontSize: 15, color: '#6B6B80', textAlign: 'center' },
  ratingBar: { flexDirection: 'row', gap: 8, paddingBottom: 24 },
  ratingBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  ratingText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  ratingAgain: { backgroundColor: '#EF4444' },
  ratingHard: { backgroundColor: '#F97316' },
  ratingGood: { backgroundColor: '#22C55E' },
  ratingEasy: { backgroundColor: '#3B82F6' },
});
