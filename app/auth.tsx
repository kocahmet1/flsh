// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../src/firebase/config';
import { useAuth } from '../src/context/AuthContext';

const PALETTE = {
  bgTop: '#5263A2',
  bgMid: '#2F4378',
  bgBottom: '#10172B',
  surface: '#FBFCFF',
  text: '#24305F',
  textMuted: '#687294',
  border: '#DCE3FF',
  primary: '#6170FF',
  danger: '#D43F5D',
};

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

function cleanAuthError(error: any) {
  const code = error?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password')) {
    return 'The email or password is not correct.';
  }
  if (code.includes('user-not-found')) return 'No account exists for that email.';
  if (code.includes('email-already-in-use')) return 'An account already exists for that email.';
  if (code.includes('weak-password')) return 'Use a password with at least 6 characters.';
  if (code.includes('invalid-email')) return 'Enter a valid email address.';
  if (code.includes('network-request-failed')) return 'Network error. Check your connection and try again.';
  return error?.message || 'Authentication failed.';
}

export default function AuthScreen() {
  const router = useRouter();
  const { user, initializing, firebaseReady } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initializing && user) {
      router.replace('/(tabs)');
    }
  }, [initializing, router, user?.uid]);

  const styles = useMemo(() => createStyles(), []);

  const submit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!firebaseReady) {
      setError('Firebase is not configured for this build.');
      return;
    }
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (mode === 'signup' && !trimmedName) {
      setError('Enter your name for the account profile.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(credential.user, { displayName: trimmedName });
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }
      router.replace('/(tabs)');
    } catch (err) {
      setError(cleanAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!firebaseReady) {
      setError('Firebase is not configured for this build.');
      return;
    }
    if (!trimmedEmail) {
      setError('Enter your email first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      showMessage('Reset email sent', 'Check your inbox for a password reset link.');
    } catch (err) {
      setError(cleanAuthError(err));
    }
  };

  return (
    <LinearGradient colors={[PALETTE.bgTop, PALETTE.bgMid, PALETTE.bgBottom]} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <View style={styles.logoBadge}>
              <MaterialCommunityIcons name="cards-outline" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Sat Vocab Master</Text>
            <Text style={styles.subtitle}>
              Sign in to keep your vocab sets synced across the web build.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segmentButton, mode === 'signin' && styles.segmentButtonActive]}
                onPress={() => {
                  setMode('signin');
                  setError('');
                }}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    mode === 'signin' && styles.segmentButtonTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, mode === 'signup' && styles.segmentButtonActive]}
                onPress={() => {
                  setMode('signup');
                  setError('');
                }}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    mode === 'signup' && styles.segmentButtonTextActive,
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {!firebaseReady ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="cloud-alert-outline" size={20} color={PALETTE.danger} />
                <Text style={styles.errorText}>
                  Firebase environment variables are missing in this build. Add the
                  EXPO_PUBLIC_FIREBASE_* keys in Render and rebuild.
                </Text>
              </View>
            ) : null}

            {mode === 'signup' ? (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor="#8A94B8"
                  value={name}
                  onChangeText={setName}
                  editable={!saving}
                />
              </>
            ) : null}

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#8A94B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!saving}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#8A94B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!saving}
              />
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowPassword((value) => !value)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={PALETTE.textMuted}
                />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.formError}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.disabledButton]}
              onPress={submit}
              disabled={saving || !firebaseReady}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={mode === 'signin' ? 'login' : 'account-plus-outline'}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {mode === 'signin' ? (
              <TouchableOpacity style={styles.linkButton} onPress={resetPassword} disabled={saving}>
                <Text style={styles.linkText}>Send password reset email</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function createStyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    keyboardWrap: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
      gap: 22,
    },
    brandBlock: {
      alignItems: 'center',
      gap: 10,
    },
    logoBadge: {
      width: 64,
      height: 64,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    title: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '800',
      textAlign: 'center',
    },
    subtitle: {
      color: '#DDE4FF',
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 430,
    },
    panel: {
      width: '100%',
      maxWidth: 460,
      alignSelf: 'center',
      backgroundColor: PALETTE.surface,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
      gap: 10,
    },
    segment: {
      flexDirection: 'row',
      padding: 5,
      borderRadius: 16,
      backgroundColor: '#EEF2FF',
      marginBottom: 6,
    },
    segmentButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentButtonActive: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: PALETTE.border,
    },
    segmentButtonText: {
      color: PALETTE.textMuted,
      fontSize: 14,
      fontWeight: '800',
    },
    segmentButtonTextActive: {
      color: PALETTE.primary,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor: '#FFF1F2',
      borderWidth: 1,
      borderColor: '#FECDD3',
    },
    errorText: {
      color: PALETTE.danger,
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
    },
    label: {
      color: PALETTE.text,
      fontSize: 13,
      fontWeight: '800',
      marginTop: 4,
    },
    input: {
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: PALETTE.border,
      backgroundColor: '#F8FAFF',
      color: PALETTE.text,
      paddingHorizontal: 14,
      fontSize: 15,
    },
    passwordRow: {
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: PALETTE.border,
      backgroundColor: '#F8FAFF',
      flexDirection: 'row',
      alignItems: 'center',
    },
    passwordInput: {
      flex: 1,
      color: PALETTE.text,
      paddingHorizontal: 14,
      fontSize: 15,
      height: '100%',
    },
    iconButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formError: {
      color: PALETTE.danger,
      fontSize: 13,
      lineHeight: 18,
    },
    primaryButton: {
      height: 50,
      borderRadius: 14,
      backgroundColor: PALETTE.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    disabledButton: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    linkButton: {
      alignSelf: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    linkText: {
      color: PALETTE.primary,
      fontSize: 13,
      fontWeight: '800',
    },
  });
}
