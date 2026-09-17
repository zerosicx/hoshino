import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ChevronLeft, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  ATTRIBUTIONS,
  EDRDG_LICENCE_URL,
  PRIVACY_POLICY,
  PRIVACY_POLICY_URL,
} from '@/constants/attributions';

/**
 * Sources and licences, and the privacy policy. Its own screen because the
 * dictionary licence requires the acknowledgement to be reachable from a
 * menu on a screen of its own.
 */
export default function AboutScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const primary = isDark ? 'text-zinc-50' : 'text-zinc-900';
  const secondary = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const divider = isDark ? 'border-zinc-800' : 'border-zinc-200';

  return (
    <ScrollView
      className={`flex-1 ${isDark ? 'bg-zinc-950' : 'bg-white'} px-4 pt-14`}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Pressable onPress={() => router.back()} className="flex-row items-center mb-4" hitSlop={8}>
        <ChevronLeft size={20} color={isDark ? '#6366F1' : '#4F46E5'} />
        <Text className="text-body text-accent dark:text-accent-light ml-1">Settings</Text>
      </Pressable>

      <Text className={`text-largeTitle font-bold tracking-tight ${primary}`}>About</Text>
      <Text className={`text-footnote mt-1 mb-6 ${secondary}`}>
        hoshino: jisho {Constants.expoConfig?.version ?? ''} · an offline Japanese dictionary and study tool by zerosicx
      </Text>

      <Text className={`text-body font-semibold ${primary} mb-1`}>Sources and licences</Text>
      <Text className={`text-footnote ${secondary} mb-3`}>
        The dictionary is built from these projects. Each is used under its own licence, and the
        app would not exist without them.
      </Text>

      {ATTRIBUTIONS.map((a) => (
        <View key={a.name} className={`py-3 border-b ${divider}`}>
          <View className="flex-row items-baseline justify-between">
            <Text className={`text-subheadline font-semibold ${primary}`}>{a.name}</Text>
            <Text className={`text-caption1 ${secondary}`}>{a.licence}</Text>
          </View>
          <Text className={`text-caption1 ${secondary} mb-1`}>{a.what}</Text>
          <Text className={`text-footnote ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{a.text}</Text>
          <Link url={a.url} label={a.url.replace(/^https?:\/\//, '')} isDark={isDark} />
        </View>
      ))}

      <View className="py-3">
        <Text className={`text-footnote ${secondary}`}>
          The JMdict and KANJIDIC2 files are made available under the Creative Commons
          Attribution-ShareAlike 4.0 licence by the Electronic Dictionary Research and Development
          Group.
        </Text>
        <Link url={EDRDG_LICENCE_URL} label="EDRDG licence statement" isDark={isDark} />
      </View>

      <Text className={`text-body font-semibold ${primary} mt-6 mb-3`}>Privacy</Text>
      {PRIVACY_POLICY.map((paragraph, i) => (
        <Text key={i} className={`text-footnote mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
          {paragraph}
        </Text>
      ))}
      <Link url={PRIVACY_POLICY_URL} label="Privacy policy online" isDark={isDark} />
    </ScrollView>
  );
}

function Link({ url, label, isDark }: { url: string; label: string; isDark: boolean }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={6}
      className="flex-row items-center gap-1 mt-1.5 self-start"
    >
      <Text className="text-caption1 text-accent dark:text-accent-light" numberOfLines={1}>
        {label}
      </Text>
      <ExternalLink size={12} color={isDark ? '#6366F1' : '#4F46E5'} />
    </Pressable>
  );
}
