import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, Monitor, ShieldCheck } from 'lucide-react-native';

export default function SettingsScreen() {
  const { themeMode, readingMode, setThemeMode, setReadingMode } = useSettingsStore();
  const { isDark } = useTheme();

  return (
    <ScrollView className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'} px-4 pt-14`}>
      {/* Header */}
      <Text className={`text-3xl font-bold ${isDark ? 'text-zinc-50' : 'text-zinc-900'} mb-6 tracking-tight`}>
        Settings
      </Text>

      {/* Section 1: Appearance / Theme */}
      <Text className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'} uppercase tracking-wider mb-2 px-1`}>
        Appearance
      </Text>
      <View className={`border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'} rounded-xl p-3 mb-6`}>
        <Text className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'} mb-3`}>
          Display Mode
        </Text>
        <View className="flex-row gap-2">
          <ThemeOption
            label="System"
            icon={<Monitor size={16} color={themeMode === 'system' ? '#FFFFFF' : (isDark ? '#A1A1AA' : '#71717A')} />}
            active={themeMode === 'system'}
            isDark={isDark}
            onSelect={() => setThemeMode('system')}
          />
          <ThemeOption
            label="Light"
            icon={<Sun size={16} color={themeMode === 'light' ? '#FFFFFF' : (isDark ? '#A1A1AA' : '#71717A')} />}
            active={themeMode === 'light'}
            isDark={isDark}
            onSelect={() => setThemeMode('light')}
          />
          <ThemeOption
            label="Dark"
            icon={<Moon size={16} color={themeMode === 'dark' ? '#FFFFFF' : (isDark ? '#A1A1AA' : '#71717A')} />}
            active={themeMode === 'dark'}
            isDark={isDark}
            onSelect={() => setThemeMode('dark')}
          />
        </View>
      </View>

      {/* Section 2: Japanese Display / Reading */}
      <Text className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'} uppercase tracking-wider mb-2 px-1`}>
        Japanese Reading Hint
      </Text>
      <View className={`border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'} rounded-xl p-3 mb-6`}>
        <Text className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'} mb-3`}>
          Reading Display Above Kanji
        </Text>
        <View className="flex-row gap-2">
          <ReadingOption
            label="Furigana (ふりがな)"
            active={readingMode === 'furigana'}
            isDark={isDark}
            onSelect={() => setReadingMode('furigana')}
          />
          <ReadingOption
            label="Romaji (Romaji)"
            active={readingMode === 'romaji'}
            isDark={isDark}
            onSelect={() => setReadingMode('romaji')}
          />
        </View>
      </View>

      {/* Section 3: Account & Sync */}
      <Text className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'} uppercase tracking-wider mb-2 px-1`}>
        Account & Data
      </Text>
      <View className={`border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'} rounded-xl p-4 mb-8 flex-row items-center justify-between`}>
        <View className="flex-row items-center">
          <ShieldCheck size={20} color="#22C55E" />
          <View className="ml-3">
            <Text className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Guest Mode Active</Text>
            <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Data stored 100% locally on device</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <Text className={`text-center text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'} mb-12`}>
        Hoshino v1.0.0 • Offline-First Japanese Dictionary
      </Text>
    </ScrollView>
  );
}

function ThemeOption({
  label,
  icon,
  active,
  isDark,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  isDark: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      className={`flex-1 flex-row items-center justify-center py-2.5 px-3 rounded-lg border ${
        active
          ? 'bg-indigo-600 border-indigo-600'
          : isDark
          ? 'bg-zinc-800 border-zinc-700'
          : 'bg-white border-zinc-200'
      }`}
      onPress={onSelect}
    >
      {icon}
      <Text
        className={`text-xs font-semibold ml-1.5 ${
          active
            ? 'text-white'
            : isDark
            ? 'text-zinc-300'
            : 'text-zinc-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ReadingOption({
  label,
  active,
  isDark,
  onSelect,
}: {
  label: string;
  active: boolean;
  isDark: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      className={`flex-1 py-2.5 px-3 rounded-lg border items-center ${
        active
          ? 'bg-indigo-600 border-indigo-600'
          : isDark
          ? 'bg-zinc-800 border-zinc-700'
          : 'bg-white border-zinc-200'
      }`}
      onPress={onSelect}
    >
      <Text
        className={`text-xs font-semibold ${
          active
            ? 'text-white'
            : isDark
            ? 'text-zinc-300'
            : 'text-zinc-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}