import { Tabs } from 'expo-router';
import { Search, Library, Settings as SettingsIcon } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export default function TabsLayout() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'web' ? 4 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#09090B' : '#FFFFFF',
          borderTopColor: isDark ? '#27272A' : '#E4E4E7',
          borderTopWidth: 1,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 6,
        },
        tabBarActiveTintColor: isDark ? '#6366F1' : '#4F46E5',
        tabBarInactiveTintColor: isDark ? '#A1A1AA' : '#71717A',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="dictionary/index"
        options={{
          title: 'Dictionary',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lists/index"
        options={{
          title: 'Lists',
          tabBarIcon: ({ color, size }) => <Library color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="dictionary/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="dictionary/kanji/[char]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="lists/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="lists/jlpt"
        options={{
          href: null,
        }}
      />
      {/* Hidden until Stage 4. The routes still work if navigated to directly. */}
      <Tabs.Screen
        name="study/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="study/session"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
