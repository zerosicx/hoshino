import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function StudyScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Study</Text>
      <View style={styles.statsRow}>
        <Stat label="Streak" value="0 days" />
        <Stat label="Due today" value="0" />
        <Stat label="Accuracy" value="—" />
      </View>
      <Pressable style={styles.cta} onPress={() => router.push('/study/session')}>
        <Text style={styles.ctaText}>Start Session</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F14', padding: 16, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#F4F4F8', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  stat: {
    flex: 1,
    backgroundColor: '#1A1A24',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700', color: '#F4F4F8' },
  statLabel: { fontSize: 12, color: '#6B6B80', marginTop: 4 },
  cta: {
    backgroundColor: '#6D28D9',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
