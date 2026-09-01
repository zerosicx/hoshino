import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Flame, Target, BookOpen, Play } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

export default function StudyScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  return (
    <ScrollView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'} px-4 pt-14`}>
      {/* Header */}
      <Text className={`text-3xl font-bold ${isDark ? 'text-zinc-50' : 'text-zinc-900'} mb-6 tracking-tight`}>
        Study
      </Text>

      {/* Stats Bar */}
      <View className={`flex-row border ${isDark ? 'border-zinc-800 bg-zinc-900 divide-zinc-800' : 'border-zinc-200 bg-zinc-50 divide-zinc-200'} rounded-xl p-3 mb-6 divide-x`}>
        <View className="flex-1 items-center py-1">
          <View className="flex-row items-center mb-1">
            <Flame size={16} color="#F97316" />
            <Text className={`text-lg font-bold ${isDark ? 'text-zinc-50' : 'text-zinc-900'} ml-1`}>0</Text>
          </View>
          <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} font-medium`}>Day Streak</Text>
        </View>

        <View className="flex-1 items-center py-1">
          <View className="flex-row items-center mb-1">
            <Target size={16} color="#22C55E" />
            <Text className={`text-lg font-bold ${isDark ? 'text-zinc-50' : 'text-zinc-900'} ml-1`}>—</Text>
          </View>
          <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} font-medium`}>Accuracy</Text>
        </View>

        <View className="flex-1 items-center py-1">
          <View className="flex-row items-center mb-1">
            <BookOpen size={16} color={isDark ? '#818CF8' : '#4F46E5'} />
            <Text className={`text-lg font-bold ${isDark ? 'text-zinc-50' : 'text-zinc-900'} ml-1`}>0</Text>
          </View>
          <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} font-medium`}>Reviewed</Text>
        </View>
      </View>

      {/* Start Session CTA */}
      <Pressable
        className="bg-indigo-600 active:bg-indigo-700 rounded-xl p-4 flex-row items-center justify-center mb-8 shadow-sm"
        onPress={() => router.push('/study/session')}
      >
        <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
        <Text className="text-white text-base font-semibold ml-2">
          Start Daily Review
        </Text>
      </Pressable>

      {/* Active Study Lists Section */}
      <Text className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'} mb-3`}>
        Active Study Lists
      </Text>

      <View className={`border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'} rounded-xl p-4 mb-3 flex-row justify-between items-center`}>
        <View>
          <Text className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>JLPT N5 Vocabulary</Text>
          <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-0.5`}>634 words • 0 reviewed</Text>
        </View>
        <View className={`${isDark ? 'bg-indigo-950 border-indigo-800' : 'bg-indigo-50 border-indigo-100'} border px-3 py-1 rounded-full`}>
          <Text className={`text-xs font-semibold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>0 Due</Text>
        </View>
      </View>

      <View className={`border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'} rounded-xl p-4 mb-6 flex-row justify-between items-center`}>
        <View>
          <Text className={`text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Searched Terms</Text>
          <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'} mt-0.5`}>Auto-generated list</Text>
        </View>
        <View className={`${isDark ? 'bg-zinc-800' : 'bg-zinc-100'} px-3 py-1 rounded-full`}>
          <Text className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>0 Due</Text>
        </View>
      </View>
    </ScrollView>
  );
}
