import { View, Text, FlatList, Pressable, useColorScheme as useDeviceColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Bookmark } from 'lucide-react-native';
import { useSettingsStore } from '@/stores/settingsStore';

const JLPT_LISTS = [
  { id: '1', name: 'JLPT N5 Vocabulary', count: 634, level: 'N5' },
  { id: '2', name: 'JLPT N5 Kanji', count: 180, level: 'N5' },
  { id: '3', name: 'JLPT N4 Vocabulary', count: 602, level: 'N4' },
  { id: '4', name: 'JLPT N4 Kanji', count: 262, level: 'N4' },
  { id: '5', name: 'JLPT N3 Vocabulary', count: 1613, level: 'N3' },
  { id: '6', name: 'JLPT N3 Kanji', count: 458, level: 'N3' },
  { id: '7', name: 'JLPT N2 Vocabulary', count: 1682, level: 'N2' },
  { id: '8', name: 'JLPT N2 Kanji', count: 394, level: 'N2' },
  { id: '9', name: 'JLPT N1 Vocabulary', count: 3014, level: 'N1' },
  { id: '10', name: 'JLPT N1 Kanji', count: 847, level: 'N1' },
];

export default function ListsScreen() {
  const router = useRouter();
  const deviceScheme = useDeviceColorScheme();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const isDark = themeMode === 'dark' || (themeMode === 'system' && deviceScheme === 'dark');

  return (
    <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'} pt-14`}>
      {/* Header */}
      <Text className={`text-3xl font-bold ${isDark ? 'text-zinc-50' : 'text-zinc-900'} mb-4 px-4 tracking-tight`}>
        Study Lists
      </Text>

      <FlatList
        data={JLPT_LISTS}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View className={`h-px ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'} ml-12`} />}
        renderItem={({ item }) => (
          <Pressable
            className={`flex-row items-center justify-between px-4 py-3.5 ${isDark ? 'active:bg-zinc-900' : 'active:bg-zinc-50'}`}
            onPress={() => router.push(`/lists/${item.id}`)}
          >
            <View className="flex-row items-center flex-1">
              <View className={`w-8 h-8 rounded-lg ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'} items-center justify-center mr-3`}>
                <Bookmark size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
              </View>
              <View>
                <Text className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>{item.name}</Text>
                <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{item.count} items</Text>
              </View>
            </View>
            <ChevronRight size={18} color={isDark ? '#71717A' : '#A1A1AA'} />
          </Pressable>
        )}
      />
    </View>
  );
}
