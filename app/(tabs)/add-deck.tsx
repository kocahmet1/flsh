// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDecks } from '../../src/hooks/useDecks';
import { useApp } from '../../src/context/AppContext';

export default function CreateDeckScreen() {
  const { theme } = useApp();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c, theme.name === 'dark'), [c, theme.name]);
  const { createDeck } = useDecks();

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter a deck name first.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const deck = await createDeck(trimmed);
      if (!deck?.id) {
        throw new Error('Deck creation failed.');
      }
      setName('');
      router.replace(`/deck/${deck.id}`);
    } catch (err: any) {
      setError(err?.message || 'Deck creation failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={theme.name === 'dark' ? ['#0F172A', '#172554'] : ['#EFF6FF', '#FFFFFF']}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <MaterialCommunityIcons
            name="cards-variant"
            size={22}
            color={theme.name === 'dark' ? '#BFDBFE' : '#1D4ED8'}
          />
        </View>
        <Text style={styles.title}>Create a Local Deck</Text>
        <Text style={styles.subtitle}>
          New decks are saved on this device. You can add cards manually, with AI definitions, or from an image.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.label}>Deck Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Examples: SAT Verbs, Biology Terms"
          placeholderTextColor={c.textSecondary}
          value={name}
          onChangeText={setName}
          editable={!saving}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.buttonText}>Create Deck</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(c: any, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
      padding: 16,
    },
    hero: {
      borderRadius: 24,
      padding: 20,
      marginBottom: 18,
    },
    heroBadge: {
      width: 46,
      height: 46,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#DBEAFE',
      marginBottom: 16,
    },
    title: {
      color: isDark ? '#FFFFFF' : '#0F172A',
      fontSize: 28,
      fontWeight: '800',
      marginBottom: 8,
    },
    subtitle: {
      color: isDark ? 'rgba(255,255,255,0.8)' : '#475569',
      fontSize: 14,
      lineHeight: 21,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
    },
    label: {
      color: c.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 10,
    },
    input: {
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      color: c.text,
      paddingHorizontal: 14,
      fontSize: 16,
      marginBottom: 14,
    },
    error: {
      color: '#EF4444',
      marginBottom: 12,
    },
    button: {
      height: 50,
      borderRadius: 14,
      backgroundColor: c.buttonPrimaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: c.buttonPrimaryText,
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
