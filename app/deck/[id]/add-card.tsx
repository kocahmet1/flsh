// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDeck } from '../../../src/hooks/useDeck';
import { useApp } from '../../../src/context/AppContext';
import { AI_FEATURES_NOTE } from '../../../src/constants/FeatureFlags';
import { generateDefinitions, extractTextFromImage } from '../../../src/utils/gemini';
import { getAiErrorMessage } from '../../../src/utils/openaiConfig';
import { convertImageToBase64 } from '../../../src/utils/imageUtils';

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export default function AddCardScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useApp();
  const c = theme.colors;
  const styles = useMemo(() => createStyles(c, theme.name === 'dark'), [c, theme.name]);
  const { deck, loading, addCard } = useDeck(id);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [sampleSentence, setSampleSentence] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const saveManualCard = async () => {
    if (!front.trim() || !back.trim()) {
      Alert.alert('Missing fields', 'Both the front and back of the card are required.');
      return;
    }

    setBusy(true);
    setBusyLabel('Saving card…');
    try {
      const newCardId = await addCard(front.trim(), back.trim(), sampleSentence.trim());
      if (!newCardId) {
        Alert.alert('Save failed', 'The card could not be saved.');
        return;
      }
      
      // Auto-generate audio in background automatically
      console.log('🎤 Auto-generating audio for new card...');
      import('../../../src/utils/deckAudioGeneration').then(({ generateAndSaveAudioForCard }) => {
        generateAndSaveAudioForCard(
          id,
          newCardId,
          {
            front: front.trim(),
            back: back.trim(),
            sampleSentence: sampleSentence.trim()
          },
          'alloy'
        )
          .then(() => console.log('✅ Audio auto-generation complete'))
          .catch(err => console.error('❌ Audio auto-generation failed:', err));
      });

      router.back();
    } catch (error) {
      Alert.alert('Save failed', 'The card could not be saved.');
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const importWordsWithAi = async (words: string[]) => {
    const uniqueWords = Array.from(
      new Set(words.map((word) => word.trim()).filter(Boolean))
    );

    if (!uniqueWords.length) {
      Alert.alert('No words found', 'Add at least one word to continue.');
      return;
    }

    setBusy(true);

    try {
      const batches = chunk(uniqueWords, 10);

      for (let i = 0; i < batches.length; i++) {
        setBusyLabel(`Generating definitions… (${i + 1}/${batches.length})`);
        const generated = await generateDefinitions(batches[i]);

        for (const row of generated) {
          const [word, definition, sentence] = row || [];
          if (!word || !definition) continue;
          const newCardId = await addCard(
            String(word).trim(),
            String(definition).trim(),
            String(sentence || '').trim()
          );
          if (!newCardId) {
            throw new Error('Generated card could not be saved.');
          }

          // Generate audio in background for AI-imported cards
          import('../../../src/utils/deckAudioGeneration').then(({ generateAndSaveAudioForCard }) => {
            generateAndSaveAudioForCard(
              id,
              newCardId,
              {
                front: String(word).trim(),
                back: String(definition).trim(),
                sampleSentence: String(sentence || '').trim()
              },
              'alloy'
            )
              .then(() => console.log(`✅ Audio generated for AI imported word: ${word}`))
              .catch(err => console.error(`❌ Audio auto-gen failed for word ${word}:`, err));
          });
        }
      }

      router.back();
    } catch (error) {
      console.error('AI import failed:', error);
      Alert.alert('AI import failed', getAiErrorMessage(error, 'Definition generation'));
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  const handleBulkImport = async () => {
    const words = bulkWords
      .split('\n')
      .map((word) => word.trim())
      .filter(Boolean);

    await importWordsWithAi(words);
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert('Permission required', 'Camera access is needed to capture an image.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 1,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
          setImageUri(result.assets[0].uri);
        }
        return;
      }

      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!libraryPermission.granted) {
        Alert.alert('Permission required', 'Photo library access is needed to choose an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Image error', 'The image could not be selected.');
    }
  };

  const handleImageImport = async () => {
    if (!imageUri) {
      Alert.alert('No image selected', 'Choose or capture an image first.');
      return;
    }

    setBusy(true);
    setBusyLabel('Reading image…');

    try {
      const base64 = await convertImageToBase64(imageUri);
      const extractedText = await extractTextFromImage(base64);

      if (!extractedText) {
        Alert.alert('Nothing found', 'No underlined words were detected in this image.');
        return;
      }

      const words = extractedText
        .split(/,|\n/)
        .map((word) => word.trim())
        .filter(Boolean);

      if (!words.length) {
        Alert.alert('Nothing found', 'No usable words were extracted from this image.');
        return;
      }

      await importWordsWithAi(words);
    } catch (error) {
      console.error('Image import failed:', error);
      Alert.alert('Image import failed', getAiErrorMessage(error, 'Image reading'));
    } finally {
      setBusy(false);
      setBusyLabel('');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={c.tabBarActive} />
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={44} color="#EF4444" />
        <Text style={styles.missingTitle}>Deck not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Add cards to {deck.name}</Text>
        <Text style={styles.bannerBody}>
          Cards save to your account immediately. You can add them manually, generate definitions, or import words from an image.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Card</Text>
        <TextInput
          style={styles.input}
          placeholder="Word or phrase"
          placeholderTextColor={c.textSecondary}
          value={front}
          onChangeText={setFront}
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          placeholder="Definition"
          placeholderTextColor={c.textSecondary}
          value={back}
          onChangeText={setBack}
          editable={!busy}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Sample sentence (optional)"
          placeholderTextColor={c.textSecondary}
          value={sampleSentence}
          onChangeText={setSampleSentence}
          editable={!busy}
          multiline
        />
        <TouchableOpacity style={styles.primaryButton} onPress={saveManualCard} disabled={busy}>
          <MaterialCommunityIcons name="content-save-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Save Card</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bulk Add with AI</Text>
        <Text style={styles.sectionNote}>{AI_FEATURES_NOTE}</Text>
        <Text style={styles.sectionBody}>
          Enter one word per line. The app will generate a Turkish definition and an English sample sentence for each word.
        </Text>
        <TextInput
          style={[styles.input, styles.bulkInput]}
          placeholder={'abate\nlucid\npragmatic'}
          placeholderTextColor={c.textSecondary}
          value={bulkWords}
          onChangeText={setBulkWords}
          editable={!busy}
          multiline
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBulkImport} disabled={busy}>
          <MaterialCommunityIcons name="creation" size={18} color={c.text} />
          <Text style={styles.secondaryButtonText}>Generate and Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Import from Image</Text>
        <Text style={styles.sectionNote}>{AI_FEATURES_NOTE}</Text>
        <Text style={styles.sectionBody}>
          Capture or choose an image with underlined words. The app will extract those words and generate cards for them.
        </Text>

        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.imageButton} onPress={() => pickImage(true)} disabled={busy}>
            <MaterialCommunityIcons name="camera-outline" size={18} color={c.text} />
            <Text style={styles.imageButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageButton} onPress={() => pickImage(false)} disabled={busy}>
            <MaterialCommunityIcons name="image-outline" size={18} color={c.text} />
            <Text style={styles.imageButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <TouchableOpacity style={styles.clearPreview} onPress={() => setImageUri(null)}>
              <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.secondaryButton, !imageUri && styles.disabledButton]}
          onPress={handleImageImport}
          disabled={!imageUri || busy}
        >
          <MaterialCommunityIcons name="text-recognition" size={18} color={c.text} />
          <Text style={styles.secondaryButtonText}>Read Image and Create Cards</Text>
        </TouchableOpacity>
      </View>

      {busy ? (
        <View style={styles.busyCard}>
          <ActivityIndicator size="small" color={c.tabBarActive} />
          <Text style={styles.busyText}>{busyLabel || 'Working…'}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(c: any, isDark: boolean) {
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
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    missingTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
      marginTop: 12,
    },
    banner: {
      backgroundColor: c.surface,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
    },
    bannerTitle: {
      color: c.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 8,
    },
    bannerBody: {
      color: c.textSecondary,
      lineHeight: 21,
    },
    section: {
      backgroundColor: c.surface,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
    },
    sectionTitle: {
      color: c.text,
      fontSize: 18,
      fontWeight: '800',
    },
    sectionNote: {
      color: c.warning,
      fontSize: 12,
      fontWeight: '700',
    },
    sectionBody: {
      color: c.textSecondary,
      lineHeight: 20,
    },
    input: {
      minHeight: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      color: c.text,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    textArea: {
      minHeight: 92,
      textAlignVertical: 'top',
    },
    bulkInput: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: c.buttonPrimaryBg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryButtonText: {
      color: c.buttonPrimaryText,
      fontWeight: '800',
    },
    secondaryButton: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: isDark ? '#334155' : '#F8FAFC',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryButtonText: {
      color: c.text,
      fontWeight: '800',
    },
    imageActions: {
      flexDirection: 'row',
      gap: 10,
    },
    imageButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    imageButtonText: {
      color: c.text,
      fontWeight: '700',
    },
    previewWrap: {
      position: 'relative',
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
    },
    preview: {
      width: '100%',
      height: 180,
      resizeMode: 'cover',
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
    },
    clearPreview: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15,23,42,0.8)',
    },
    disabledButton: {
      opacity: 0.45,
    },
    busyCard: {
      marginTop: 2,
      borderRadius: 16,
      padding: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    busyText: {
      color: c.text,
      fontWeight: '600',
    },
  });
}
