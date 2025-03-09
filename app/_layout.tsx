import { Stack } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

// Add CSS animations for web platform
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    // Import the global CSS file for web
    require('../assets/global.css');
    
    // Create additional style element for dynamic animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.03); opacity: 1; }
        100% { transform: scale(1); opacity: 0.9; }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes shimmer {
        0% { transform: translateX(-100%) rotate(30deg); }
        100% { transform: translateX(100%) rotate(30deg); }
      }

      .progress-bar {
        position: relative;
        overflow: hidden;
      }
      
      .progress-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 50%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shimmer 2s infinite linear;
      }
      
      .set-card {
        animation: fadeIn 0.5s ease-out forwards;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      
      .set-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
      }
      
      .create-button, .import-button {
        animation: pulse 3s infinite ease-in-out;
        transition: all 0.3s ease;
      }
      
      .create-button:hover, .import-button:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
  } catch (error) {
    console.warn('Could not add web animations:', error);
  }
}
import { useRouter, SplashScreen, Slot } from 'expo-router';
import { AppProvider } from '../src/context/AppContext';
import TabBarIcon from '../src/components/TabBarIcon';
import { useEffect, useState } from 'react';
import { auth } from '../src/firebase/config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';

// Keep the splash screen visible until we're ready to render
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isLayoutReady, setIsLayoutReady] = useState(false);

  // Load Material Icons font
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
  });

  // First, ensure the layout is ready
  useEffect(() => {
    if (fontsLoaded) {
      setIsLayoutReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Then handle auth state
  useEffect(() => {
    if (!isLayoutReady) return;

    // Set up auth state listener
    const checkAuthState = async () => {
      try {
        setIsLoading(true);

        // Set up auth state listener
        const unsubscribe = auth.onAuthStateChanged((user) => {
          console.log("Auth state changed:", user ? "User logged in" : "No user");

          if (!user) {
            // If no user is logged in, redirect to login page
            setTimeout(() => {
              router.replace('/login');
            }, 100);
          }

          setIsLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Auth state check error:", error);
        setIsLoading(false);
        setTimeout(() => {
          router.replace('/login');
        }, 100);
      }
    };

    const unsubscribe = checkAuthState();

    // Cleanup subscription
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isLayoutReady, router]);

  // Always render the GestureHandlerRootView and AppProvider
  // with either Stack or Slot to ensure proper mounting
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        {!isLayoutReady || !fontsLoaded ? (
          // Show loading indicator while keeping the Slot mounted
          <View style={{ flex: 1 }}>
            <Slot />
            <View style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.9)' 
            }}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          </View>
        ) : isLoading ? (
          // Show authentication loading while keeping the Slot mounted
          <View style={{ flex: 1 }}>
            <Slot />
            <View style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.9)' 
            }}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={{ marginTop: 10 }}>Checking authentication...</Text>
            </View>
          </View>
        ) : (
          // Main navigation structure
          <Stack>
            <Stack.Screen
              name="login"
              options={{ 
                headerShown: false,
                gestureEnabled: false 
              }}
            />
            <Stack.Screen
              name="debug"
              options={{ 
                headerTitle: 'Debug',
                headerBackTitle: 'Back'
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{ 
                headerShown: false,
                gestureEnabled: false 
              }}
            />
            <Stack.Screen
              name="deck/[id]/index"
              options={({ route }) => ({
                headerBackTitle: 'Back',
                headerStyle: {
                  backgroundColor: '#0F172A', // Darker shade for better contrast
                },
                headerTintColor: '#F8FAFC',
                headerTitle: () => (
                  <TouchableOpacity onPress={() => router.push('/')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TabBarIcon name="cards-outline" color="#6366F1" size={24} />
                      <Text style={{ color: '#F8FAFC', marginLeft: 5, fontSize: 17 }}>My Vocab Sets</Text>
                    </View>
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="deck/[id]/add-card"
              options={{
                headerBackTitle: 'Back',
                headerStyle: {
                  backgroundColor: '#0F172A', // Darker shade for better contrast
                },
                headerTintColor: '#F8FAFC',
                headerTitle: () => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TabBarIcon name="card-plus-outline" color="#6366F1" size={24} />
                    <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600', color: '#F8FAFC' }}>Add Card</Text>
                  </View>
                ),
              }}
            />
            <Stack.Screen
              name="deck/[id]/select-mode"
              options={{
                title: 'Study Mode',
                headerBackTitle: 'Back',
                headerStyle: {
                  backgroundColor: '#0F172A', // Darker shade for better contrast
                },
                headerTintColor: '#F8FAFC',
                headerTitleStyle: {
                  color: '#F8FAFC',
                },
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
          </Stack>
        )}
      </AppProvider>
    </GestureHandlerRootView>
  );
}