import { Stack, SplashScreen } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { AppProvider, useApp } from '../src/context/AppContext';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    setIsReady(true);
    SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          {isReady ? <ThemedStack /> : <LoadingScreen />}
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  );
}

function ThemedStack() {
  const { theme } = useApp();
  const c = theme.colors;

  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerStyle: { backgroundColor: c.headerBackground },
        headerTintColor: c.headerText,
        headerTitleStyle: { color: c.headerText },
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="deck/[id]/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="deck/[id]/add-card"
        options={{
          title: 'Add Cards',
        }}
      />
      <Stack.Screen
        name="deck/[id]/study"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="deck/[id]/results"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="quiz/[deckId]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
