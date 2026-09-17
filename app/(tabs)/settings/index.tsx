import { View, Text, Pressable, ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { NEW_PER_DAY_OPTIONS, SESSION_SIZES, useSettingsStore } from '@/stores/settingsStore';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon, Monitor, ShieldCheck, ChevronRight, Info } from 'lucide-react-native';

export default function SettingsScreen() {
  const {
    themeMode,
    readingMode,
    cardFrontMode,
    sessionSize,
    newPerDay,
    motionMode,
    setThemeMode,
    setReadingMode,
    setCardFrontMode,
    setSessionSize,
    setNewPerDay,
    setMotionMode,
  } = useSettingsStore();
  const { isDark } = useTheme();
  const router = useRouter();

  return (
    <View className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'}`}>
      {/* Fixed above the scroll, so the screen's name stays in view. */}
      <View className={`px-4 pt-14 pb-3 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <Text className={`text-3xl font-bold ${isDark ? 'text-zinc-50' : 'text-zinc-900'} tracking-tight`}>
          Settings
        </Text>
      </View>

    <ScrollView
      className="flex-1 px-4"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
    >

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
            label="Romaji (English)"
            active={readingMode === 'romaji'}
            isDark={isDark}
            onSelect={() => setReadingMode('romaji')}
          />
        </View>
      </View>

      {/* Section 3: Study */}
      <Text className={`text-xs font-semibold ${isDark ? 'text-zinc-400' : 'text-zinc-500'} uppercase tracking-wider mb-2 px-1`}>
        Study
      </Text>
      <View className={`border ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'} rounded-xl p-3 mb-6`}>
        <Text className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'} mb-1`}>
          New words per day
        </Text>
        <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-3`}>
          How many words you have never seen a day may introduce, across all your lists.
        </Text>
        <View className="flex-row gap-2">
          {NEW_PER_DAY_OPTIONS.map((count) => (
            <ReadingOption
              key={count}
              label={String(count)}
              active={newPerDay === count}
              isDark={isDark}
              onSelect={() => setNewPerDay(count)}
            />
          ))}
        </View>

        <Text className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'} mt-5 mb-1`}>
          Cards per session
        </Text>
        <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-3`}>
          The most cards one session shows. Re-shows of a card do not count.
        </Text>
        <View className="flex-row gap-2">
          {SESSION_SIZES.map((size) => (
            <ReadingOption
              key={size}
              label={String(size)}
              active={sessionSize === size}
              isDark={isDark}
              onSelect={() => setSessionSize(size)}
            />
          ))}
        </View>

        <Text className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'} mt-5 mb-3`}>
          Front of the card
        </Text>
        <View className="flex-row gap-2">
          <ReadingOption
            label="Japanese"
            active={cardFrontMode === 'kanji'}
            isDark={isDark}
            onSelect={() => setCardFrontMode('kanji')}
          />
          <ReadingOption
            label="Meaning"
            active={cardFrontMode === 'meaning'}
            isDark={isDark}
            onSelect={() => setCardFrontMode('meaning')}
          />
        </View>

        <Text className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-700'} mt-5 mb-1`}>
          Animations
        </Text>
        <Text className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'} mb-3`}>
          Reduced turns the card over without the flip.
        </Text>
        <View className="flex-row gap-2">
          <ReadingOption
            label="System"
            active={motionMode === 'system'}
            isDark={isDark}
            onSelect={() => setMotionMode('system')}
          />
          <ReadingOption
            label="Reduced"
            active={motionMode === 'reduced'}
            isDark={isDark}
            onSelect={() => setMotionMode('reduced')}
          />
          <ReadingOption
            label="Full"
            active={motionMode === 'full'}
            isDark={isDark}
            onSelect={() => setMotionMode('full')}
          />
        </View>
      </View>

      {/* Section 4: Account & Sync */}
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

      {/* About: sources, licences, privacy. Its own screen, as the dictionary licence requires */}
      <Pressable
        onPress={() => router.push('/settings/about')}
        accessibilityRole="button"
        accessibilityLabel="About and sources"
        className={`border ${isDark ? 'border-zinc-800 bg-zinc-900 active:bg-zinc-800' : 'border-zinc-200 bg-zinc-50 active:bg-zinc-100'} rounded-xl p-4 mb-8 flex-row items-center justify-between`}
      >
        <View className="flex-row items-center flex-1">
          <Info size={20} color={isDark ? '#6366F1' : '#4F46E5'} />
          <View className="ml-3 flex-1">
            <Text className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>About and sources</Text>
            <Text className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Dictionary licences and the privacy policy</Text>
          </View>
        </View>
        <ChevronRight size={18} color={isDark ? '#71717A' : '#A1A1AA'} />
      </Pressable>

      {/* Footer */}
      <Text className={`text-center text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'} mb-1`}>
        Hoshino v{Constants.expoConfig?.version ?? '1.0.0'} by ZEROSICX
      </Text>
      <Text className={`text-center text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'} mb-12`}>
        Offline-First Japanese Dictionary
      </Text>
    </ScrollView>
    </View>
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