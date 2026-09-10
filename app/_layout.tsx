import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { dialogScreenOptions, stackScreenOptions } from '@/constants/navigation';
import { getDatabase } from '@/services/database';
import { useTheme } from '@/hooks/useTheme';
import NavigationThemeProvider from '@/components/NavigationThemeProvider';
import Toast from '@/components/Toast';
import '../global.css';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<Error | null>(null);

  // Applies the saved theme before any screen mounts
  useTheme();

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('?? Database init failed:', err);
        setDbError(err instanceof Error ? err : new Error(String(err)));
      });
  }, []);

  if (dbError) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Failed to load database
          </Text>
          <Text style={{ fontSize: 13, color: '#71717A', textAlign: 'center' }}>
            {dbError.message}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!dbReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationThemeProvider>
          <Stack screenOptions={stackScreenOptions}>
            {/* Listed children lead the route order, and with no launch URL
                (Android dev clients) the first route is the boot screen. */}
            <Stack.Screen name="index" />
            <Stack.Screen name="create-list" options={dialogScreenOptions} />
          </Stack>
        </NavigationThemeProvider>
        <Toast />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
