import { Redirect } from 'expo-router';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { auth } from '../src/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const [isWeb] = useState(Platform.OS === 'web');
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // On mobile, skip auth check
    if (!isWeb) {
      setAuthChecked(true);
      return;
    }

    // On web, check authentication status
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [isWeb]);

  // Show loading while checking auth on web
  if (isWeb && !authChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // On web: redirect to login if not authenticated, otherwise to tabs
  if (isWeb) {
    return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
  }

  // On mobile: always start in tabs (login is optional and accessible from Settings)
  return <Redirect href="/(tabs)" />;
}
