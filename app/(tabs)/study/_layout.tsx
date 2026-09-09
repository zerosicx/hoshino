import { Stack } from 'expo-router';
import { stackScreenOptions } from '@/constants/navigation';

export const unstable_settings = { initialRouteName: 'index' };

export default function StudyLayout() {
  return <Stack screenOptions={stackScreenOptions} />;
}
