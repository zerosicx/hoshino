import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>List #{id}</Text>
      <Text style={styles.hint}>Words in this list will display here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F14', padding: 16, paddingTop: 60 },
  back: { marginBottom: 16 },
  backText: { color: '#8B5CF6', fontSize: 17 },
  title: { fontSize: 28, fontWeight: '700', color: '#F4F4F8', marginBottom: 8 },
  hint: { color: '#6B6B80', fontSize: 15 },
});
