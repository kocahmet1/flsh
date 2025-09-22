import { Redirect } from 'expo-router';

export default function Index() {
  // Always start in tabs; login is optional and accessible from Settings
  return <Redirect href="/(tabs)" />;
}
