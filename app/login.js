import { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Text, TouchableOpacity, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { auth } from '../src/firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { clearAuthData } from '../src/utils/authUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/Colors';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Trigger Google Analytics pageview for login screen
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: isSignUp ? 'Sign Up' : 'Login',
        page_location: window.location.href,
        page_path: '/login'
      });
      console.log('Google Analytics login page view triggered');
    } else {
      console.log('Google Analytics not available on login screen');
    }

    const checkAuth = async () => {
      try {
        await clearAuthData();
        setInitialCheckDone(true);
      } catch (error) {
        console.error('Error during initial auth check:', error);
        setInitialCheckDone(true);
      }
    };

    checkAuth();
  }, [isSignUp]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Track auth attempt
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', isSignUp ? 'signup_attempt' : 'login_attempt', {
        'method': 'email_password'
      });
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        // Track successful signup
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'signup_success', {
            'method': 'email_password'
          });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // Track successful login
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'login_success', {
            'method': 'email_password'
          });
        }
      }
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Auth error:', error);
      // Track auth failure
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', isSignUp ? 'signup_failure' : 'login_failure', {
          'error': error.message
        });
      }
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };
  
  const toggleSignUp = () => {
    // Track toggle between signup and login
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'toggle_auth_mode', {
        'auth_mode': isSignUp ? 'login' : 'signup'
      });
    }
    setIsSignUp(!isSignUp);
  };

  if (!initialCheckDone) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <LinearGradient
          colors={[Colors.primary, Colors.secondary, Colors.accent]}
          style={styles.gradient}
        />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Preparing login...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.secondary, Colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      <Animated.View 
        entering={FadeInDown.duration(800).springify()} 
        style={styles.logoContainer}
      >
        <Image 
          source={require('../attached_assets/1630603219122.jpeg')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Flashcards</Text>
        <Text style={styles.appTagline}>Master your knowledge</Text>
      </Animated.View>

      <Animated.View 
        entering={FadeInUp.duration(800).springify().delay(300)} 
        style={styles.formContainer}
      >
        <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
          <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureTextEntry}
              editable={!loading}
            />
            <TouchableOpacity onPress={toggleSecureTextEntry} style={styles.eyeIcon}>
              <Ionicons 
                name={secureTextEntry ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color={Colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.disabledButton]} 
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleSignUp} disabled={loading}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 8,
  },
  formContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(46, 41, 99, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(108, 100, 251, 0.3)',
  },
  blurContainer: {
    padding: 24,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 26, 64, 0.8)',
    borderRadius: 12,
    marginBottom: 16,
    height: 56,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(108, 100, 251, 0.5)',
  },
  inputIcon: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  button: {
    backgroundColor: Colors.accent,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: 'rgba(108, 100, 251, 0.5)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchText: {
    marginTop: 20,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});