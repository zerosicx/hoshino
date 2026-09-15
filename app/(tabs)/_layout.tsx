import { Tabs } from 'expo-router';
import { Search, Library, GraduationCap, Settings as SettingsIcon } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

/** Room for the icon, the label and the padding above them. */
export const TAB_BAR_CONTENT_HEIGHT = 56;
/** Breathing room between the labels and the system bar. */
export const TAB_BAR_GAP = 8;

export default function TabsLayout() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // React Navigation fixes the bar at 49 + inset unless a height is given, so
  // padding added without one is taken out of the icon and label.
  const bottomPadding = Platform.OS === 'web' ? 4 : insets.bottom + TAB_BAR_GAP;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#09090B' : '#FFFFFF',
          borderTopColor: isDark ? '#27272A' : '#E4E4E7',
          borderTopWidth: 1,
          height: TAB_BAR_CONTENT_HEIGHT + bottomPadding,
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
        name="dictionary"
        options={{
          title: 'Dictionary',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => <GraduationCap color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lists"
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
    </Tabs>
  );
}
