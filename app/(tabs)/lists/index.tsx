import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

const PLACEHOLDER_LISTS = [
  { id: '1', name: 'JLPT N5', count: 0 },
  { id: '2', name: 'JLPT N4', count: 0 },
  { id: '3', name: 'JLPT N3', count: 0 },
  { id: '4', name: 'JLPT N2', count: 0 },
  { id: '5', name: 'JLPT N1', count: 0 },
  { id: '6', name: 'Searched Terms', count: 0 },
];

export default function ListsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lists</Text>
      <FlatList
        data={PLACEHOLDER_LISTS}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/lists/${item.id}`)}>
            <Text style={styles.listName}>{item.name}</Text>
            <Text style={styles.listMeta}>{item.count} words →</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F14', paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#F4F4F8', marginBottom: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  separator: { height: 1, backgroundColor: '#1E1E28', marginHorizontal: 16 },
  listName: { fontSize: 17, color: '#F4F4F8' },
  listMeta: { fontSize: 15, color: '#6B6B80' },
});
