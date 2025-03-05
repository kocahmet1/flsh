import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { auth, db } from '../src/firebase/config';
import { clearAuthData } from '../src/utils/authUtils';
import { useRouter } from 'expo-router';
import { ref, get } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LogoButton = ({ style }) => (
  <TouchableOpacity style={[styles.logoButton, style]}>
    <Image source={require('../assets/images/1630603219122.jpeg')} style={styles.logoImage} />
  </TouchableOpacity>
);

export default function DebugScreen() {
  const [authState, setAuthState] = useState('Checking...');
  const [userId, setUserId] = useState('None');
  const [asyncStorageKeys, setAsyncStorageKeys] = useState([]);
  const [userDecks, setUserDecks] = useState([]);
  const router = useRouter();

  useEffect(() => {
    checkAuthState();
    loadAsyncStorageKeys();
  }, []);

  const checkAuthState = () => {
    if (auth.currentUser) {
      setAuthState('Logged In');
      setUserId(auth.currentUser.uid);
      loadUserDecks(auth.currentUser.uid);
    } else {
      setAuthState('Logged Out');
      setUserId('None');
      setUserDecks([]);
    }
  };

  const loadAsyncStorageKeys = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      setAsyncStorageKeys(keys);
    } catch (error) {
      console.error('Error loading AsyncStorage keys:', error);
    }
  };

  const loadUserDecks = async (uid) => {
    try {
      const userDecksRef = ref(db, `users/${uid}/decks`);
      const snapshot = await get(userDecksRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const decksArray = Object.entries(data).map(([id, deck]) => ({
          id,
          ...deck,
        }));
        setUserDecks(decksArray);
      } else {
        setUserDecks([]);
      }
    } catch (error) {
      console.error('Error loading user decks:', error);
    }
  };

  const handleClearAuthData = async () => {
    Alert.alert(
      'Clear Auth Data',
      'This will sign you out and clear all authentication data. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Clear Data',
          onPress: async () => {
            const success = await clearAuthData();
            if (success) {
              Alert.alert('Success', 'Auth data cleared. You will be redirected to login.');
              router.replace('/login');
            } else {
              Alert.alert('Error', 'Failed to clear auth data.');
            }
          },
        },
      ]
    );
  };

  const handleGoToLogin = () => {
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LogoButton style={styles.floatingLogo} /> {/* Added LogoButton */}
        <Text style={styles.title}>Debug Information</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication State</Text>
          <Text style={styles.infoText}>Status: {authState}</Text>
          <Text style={styles.infoText}>User ID: {userId}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Decks</Text>
          {userDecks.length > 0 ? (
            userDecks.map((deck) => (
              <Text key={deck.id} style={styles.infoText}>
                • {deck.name} (ID: {deck.id})
              </Text>
            ))
          ) : (
            <Text style={styles.infoText}>No decks found</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AsyncStorage Keys</Text>
          {asyncStorageKeys.map((key, index) => (
            <Text key={index} style={styles.infoText}>
              • {key}
            </Text>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleClearAuthData}>
            <Text style={styles.buttonText}>Clear Auth Data & Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleGoToLogin}>
            <Text style={styles.buttonText}>Go to Login Screen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  floatingLogo: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 100,
  },
  logoButton: {
    width: 50,
    height: 50,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});