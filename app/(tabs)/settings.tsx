import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { useTracking } from '../../src/hooks/useTracking';
import {
  clearCustomOpenAIApiKey,
  getOpenAIApiKeySource,
  saveCustomOpenAIApiKey,
} from '../../src/utils/openaiConfig';

export default function SettingsScreen() {
  const { theme, toggleTheme } = useApp();
  const { resetStats } = useTracking();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c), [c]);
  const [openAIKeyInput, setOpenAIKeyInput] = useState('');
  const [openAIKeySource, setOpenAIKeySource] = useState<'custom' | 'bundled' | 'missing'>('missing');
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  useEffect(() => {
    (async () => {
      const source = await getOpenAIApiKeySource();
      setOpenAIKeySource(source);
    })();
  }, []);

  const handleResetStats = () => {
    Alert.alert(
      'Reset study stats?',
      'This clears quiz and study statistics on this device. Your decks and cards stay intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetStats();
          },
        },
      ]
    );
  };

  const handleSaveOpenAIKey = async () => {
    try {
      await saveCustomOpenAIApiKey(openAIKeyInput);
      setOpenAIKeyInput('');
      setOpenAIKeySource('custom');
      Alert.alert('OpenAI key saved', 'AI tools will now use your saved OpenAI API key on this device.');
    } catch (error) {
      Alert.alert('Could not save key', 'Enter a valid OpenAI API key and try again.');
    }
  };

  const handleClearOpenAIKey = async () => {
    await clearCustomOpenAIApiKey();
    const source = await getOpenAIApiKeySource();
    setOpenAIKeySource(source);
    setOpenAIKeyInput('');
    Alert.alert(
      'Custom key removed',
      source === 'bundled'
        ? 'The app will fall back to its bundled OpenAI key.'
        : 'No OpenAI key is configured now. Add one to use AI tools.'
    );
  };

  const openAIStatusText =
    openAIKeySource === 'custom'
      ? 'Using your saved OpenAI API key.'
      : openAIKeySource === 'bundled'
        ? 'Using the bundled app OpenAI key. If quota is exhausted, save your own key below.'
        : 'No OpenAI API key is configured. AI tools will not work until you add one.';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Theme</Text>
            <Text style={styles.value}>
              {theme.name === 'dark' ? 'Dark mode' : 'Light mode'}
            </Text>
          </View>
          <Switch
            value={theme.name === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: '#CBD5E1', true: '#818CF8' }}
            thumbColor={theme.name === 'dark' ? '#4F46E5' : '#FFFFFF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Mode</Text>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="cellphone-lock" size={18} color={c.tabBarActive} />
          <Text style={styles.infoText}>Decks, cards, and study stats stay on this device.</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="cloud-off-outline" size={18} color={c.tabBarActive} />
          <Text style={styles.infoText}>Accounts, login, sharing, gallery features, and cloud sync are disabled in this build.</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="wifi" size={18} color={c.warning} />
          <Text style={styles.infoText}>AI tools still require internet, and this build now uses OpenAI for definitions, OCR, quizzes, and AI prompt generation.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Tools</Text>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="sparkles" size={18} color={c.tabBarActive} />
          <Text style={styles.infoText}>{openAIStatusText}</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Paste OpenAI API key"
          placeholderTextColor={c.textSecondary}
          value={openAIKeyInput}
          onChangeText={setOpenAIKeyInput}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showOpenAIKey}
        />
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowOpenAIKey((value) => !value)}>
            <MaterialCommunityIcons
              name={showOpenAIKey ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={c.text}
            />
            <Text style={styles.secondaryButtonText}>{showOpenAIKey ? 'Hide Key' : 'Show Key'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveOpenAIKey}>
            <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Save Key</Text>
          </TouchableOpacity>
        </View>
        {openAIKeySource === 'custom' ? (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearOpenAIKey}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
            <Text style={styles.clearButtonText}>Remove Custom Key</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Maintenance</Text>
        <TouchableOpacity style={styles.resetButton} onPress={handleResetStats}>
          <MaterialCommunityIcons name="chart-line-variant" size={18} color="#FFFFFF" />
          <Text style={styles.resetButtonText}>Reset Study Stats</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.infoText}>Version 1.0.0</Text>
        <Text style={styles.infoText}>Local-first mobile build for Android and iPhone</Text>
      </View>
    </ScrollView>
  );
}

function createStyles(c: any) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: 16,
      gap: 14,
      paddingBottom: 32,
    },
    section: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 17,
      fontWeight: '800',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    rowText: {
      flex: 1,
    },
    label: {
      color: c.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    value: {
      color: c.textSecondary,
      fontSize: 13,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    infoText: {
      color: c.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      flex: 1,
    },
    input: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      color: c.text,
      paddingHorizontal: 14,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryButton: {
      height: 44,
      borderRadius: 14,
      backgroundColor: c.tabBarActive,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    secondaryButton: {
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
    },
    secondaryButtonText: {
      color: c.text,
      fontWeight: '700',
    },
    clearButton: {
      height: 44,
      borderRadius: 14,
      backgroundColor: '#DC2626',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
    },
    clearButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    resetButton: {
      height: 46,
      borderRadius: 14,
      backgroundColor: '#DC2626',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
    },
    resetButtonText: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
  });
}
