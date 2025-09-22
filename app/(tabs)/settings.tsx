// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Switch } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../../src/firebase/config';
import { isCloudEnabled } from '../../src/repositories';
import { clearAuthData } from '../../src/utils/authUtils';
import { useApp } from '../../src/context/AppContext';
import { deleteAccountAndData } from '../../src/utils/accountDeletion';

export default function SettingsScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const cloud = isCloudEnabled();
  const { theme, toggleTheme } = useApp();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return () => { try { unsub && unsub(); } catch {} };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Cloud Sync</Text>
        <Text style={styles.value}>{cloud ? 'Enabled' : 'Disabled (Offline Mode)'}</Text>
        {!cloud && (
          <Text style={styles.note}>
            Cloud sync is currently disabled. You can still sign in below; syncing will be available later.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Theme</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.value}>{theme.name === 'dark' ? 'Dark Mode' : 'Light Mode'}</Text>
          <Switch
            value={theme.name === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
            thumbColor={theme.name === 'dark' ? '#4f46e5' : '#f8fafc'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Account</Text>
        {user ? (
          <>
            <Text style={styles.value}>{user.email || 'Signed in'}</Text>
            <TouchableOpacity style={styles.button} onPress={async () => { await auth.signOut(); await clearAuthData(); }}>
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#ef4444', marginTop: 10 }]}
              onPress={async () => {
                try {
                  const confirmed = Platform.OS === 'web'
                    ? window.confirm('Delete your account and all data? This cannot be undone.')
                    : true;
                  if (!confirmed) return;

                  const result = await deleteAccountAndData();
                  if (result.ok) {
                    // Ensure local auth data is cleared and navigate to login
                    await clearAuthData();
                    router.replace('/login');
                  } else if (result.requiresRecentLogin) {
                    alert('For security, please sign in again and retry deleting your account. You will be signed out now.');
                    await auth.signOut();
                    await clearAuthData();
                    router.replace('/login');
                  } else {
                    alert(result.error || 'Failed to delete account.');
                  }
                } catch (e) {
                  console.error('Delete account failed:', e);
                  alert('Failed to delete account. Please try again.');
                }
              }}
            >
              <Text style={styles.buttonText}>Delete Account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.value}>Not signed in</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
              <Text style={styles.buttonText}>Sign In (Optional)</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>About</Text>
        <Text style={styles.small}>Version: 1.0.0</Text>
        <Text style={styles.small}>Mode: {Platform.OS}</Text>
      </View>
    </View>
  );
}

const createStyles = (c: any) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: c.background },
    title: { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 12 },
    section: { backgroundColor: c.surface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: c.border },
    label: { color: c.textSecondary, fontSize: 13, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    value: { color: c.text, fontSize: 16, marginBottom: 8 },
    note: { color: c.warning, fontSize: 13 },
    button: { backgroundColor: c.buttonPrimaryBg, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
    buttonText: { color: c.buttonPrimaryText, fontWeight: '600' },
    small: { color: c.textSecondary, fontSize: 12 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  });
