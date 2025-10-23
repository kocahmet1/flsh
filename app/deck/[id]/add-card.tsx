// @ts-nocheck
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Image, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useDeck } from '../../../src/hooks/useDeck';
import { generateDefinitions, extractTextFromImage } from '../../../src/utils/gemini';
import { convertImageToBase64 } from '../../../src/utils/imageUtils';
import { generateImageForCard } from '../../../src/utils/imageGeneration';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { AI_FEATURES_NOTE } from '../../../src/constants/FeatureFlags';
import { isCloudEnabled } from '../../../src/repositories';
import queueManager from '../../../src/utils/cardProcessingQueue';

// Modern color palette - matching other components in dark mode
const Colors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#EC4899', // Pink
  secondaryLight: '#F472B6',
  accent: '#3B82F6', // Blue
  surface: '#1E293B', // Dark surface
  surfaceAlt: '#334155', // Darker alt surface
  backgroundGradient: ['rgba(15, 23, 42, 1)', 'rgba(20, 30, 50, 0.9)'], // Dark background gradient
  cardShadow: '#000000',
  text: '#F8FAFC', // Light text for dark mode
  textSecondary: '#94A3B8', // Light secondary text
  hint: '#64748B', // Hint text
  success: '#10B981', // Green
  error: '#EF4444', // Red
  warning: '#F59E0B', // Amber
};

// Placeholder LogoHeader component - Replace with your actual implementation
const LogoHeader = ({ title, showBackButton, showLogo, size }) => (
  <View style={styles.logoHeader}>
    {showLogo && <Image source={require('../../../assets/images/1630603219122.jpeg')} style={styles.logo} resizeMode="contain" />}
    <Text style={styles.logoHeaderTitle}>{title}</Text>
    {showBackButton && <TouchableOpacity onPress={() => router.back()}><Text>Back</Text></TouchableOpacity>}
  </View>
);

export default function AddCardScreen() {
  const { id } = useLocalSearchParams();
  const { deck, loading, addCard } = useDeck(id);
  const cloud = isCloudEnabled();
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [sampleSentence, setSampleSentence] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [image, setImage] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      alert('Please fill in both sides of the card');
      return;
    }

    try {
      setIsSaving(true);
      const cardId = await addCard(front.trim(), back.trim(), sampleSentence.trim());
      
      // Generate image in background if sample sentence exists
      if (cardId && sampleSentence.trim()) {
        console.log('🎨 Generating image for card in background...');
        generateImageForCard(id, cardId, sampleSentence.trim(), cloud)
          .then(() => console.log('✅ Image generation complete'))
          .catch(err => console.error('❌ Image generation failed:', err));
      }
      
      router.back();
    } catch (error) {
      console.error('Error adding card:', error);
      alert('Failed to save card. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkWords.trim()) {
      alert('Please enter some words');
      return;
    }

    try {
      setIsProcessing(true);
      const words = bulkWords
        .split('\n')
        .map(word => word.trim())
        .filter(word => word.length > 0);

      if (words.length === 0) {
        alert('Please enter at least one word');
        return;
      }

      // Add words to the background processing queue
      const queuedCount = await queueManager.addWordsToQueue(
        id,
        words,
        cloud,
        addCard
      );

      alert(
        `✅ Added ${queuedCount} words to the processing queue!\n\n` +
        `Cards will be created in the background with proper rate limiting.\n` +
        `You can leave this page - processing will continue automatically.`
      );
      
      setBulkWords(''); // Clear the input
      router.back();
    } catch (error) {
      console.error('Error adding words to queue:', error);
      alert('Failed to add words to queue. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // New function to pick image from gallery with platform-specific handling
  const pickImage = async () => {
    try {
      // For native platforms, request permissions first
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
          Alert.alert('Permission Required', 'You need to grant gallery permissions to upload images');
          return;
        }
      }

      // Launch image picker with appropriate options for each platform
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: Platform.OS === 'web', // Only request base64 directly on web
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled) {
        // On web, we might already have base64 data
        if (Platform.OS === 'web' && result.assets[0].base64) {
          setImage(result.assets[0].uri);
          // Process the image automatically
          setTimeout(() => processImageWithUri(result.assets[0].uri), 500);
        } else {
          setImage(result.assets[0].uri);
          // Process the image automatically
          setTimeout(() => processImageWithUri(result.assets[0].uri), 500);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // New function to take a photo with camera - platform specific handling
  const takePhoto = async () => {
    try {
      console.log("takePhoto function called on platform:", Platform.OS);
      // Web fallback using a hidden input to trigger camera capture on supported browsers
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (file) {
            const uri = URL.createObjectURL(file);
            console.log('Web camera captured image URI:', uri);
            setImage(uri);
            setTimeout(() => processImageWithUri(uri), 500);
          }
        };
        input.click();
        return;
      }

      // Native (iOS/Android)
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets && result.assets[0];
        const uri = asset?.uri || result.uri;
        if (uri) {
          setImage(uri);
          setTimeout(() => processImageWithUri(uri), 500);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Process image with a specific URI
  const processImageWithUri = async (uri) => {
    if (!uri) {
      Alert.alert('No Image', 'Please select or take a photo first');
      return;
    }

    try {
      setIsProcessingImage(true);

      // Convert the image to base64 - our updated utility handles platform differences
      const base64Image = await convertImageToBase64(uri);

      if (!base64Image) {
        throw new Error('Failed to convert image to base64');
      }

      // Extract underlined text from the image using Gemini Vision
      const extractedText = await extractTextFromImage(base64Image);

      if (extractedText) {
        // Split by commas if multiple underlined words were found
        const words = extractedText.split(',').map(word => word.trim()).filter(Boolean);

        if (words.length === 0) {
          Alert.alert('Extraction Failed', 'No valid words could be extracted. Please try a clearer image with underlined text.');
          return;
        }

        // Show a brief notification about words found
        const wordsMessage = `${words.length} underlined ${words.length === 1 ? 'word' : 'words'} found!`;
        Alert.alert('Processing', wordsMessage, [{ text: 'OK' }]);

        // Clear the image
        setImage(null);

        // Set state to processing mode for UI updates
        setIsProcessing(true);

        try {
          // Add words to the background processing queue instead of processing immediately
          const queuedCount = await queueManager.addWordsToQueue(
            id,
            words,
            cloud,
            addCard
          );

          Alert.alert(
            'Success!',
            `✅ Added ${queuedCount} words to the processing queue!\n\n` +
            `Cards will be created in the background with proper rate limiting.`
          );

          // Automatically navigate back to deck details screen after a short delay
          setTimeout(() => {
            router.replace(`/deck/${id}`);
          }, 1200);
        } catch (error) {
          console.error('Error adding words to queue:', error);
          Alert.alert('Error', 'Failed to add words to queue. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      } else {
        Alert.alert('No Underlined Text', 'No underlined text was found in the image. Please try an image with clearly underlined words.');
      }
    } catch (error) {
      console.error('Error processing image:', error);

      // More descriptive error messages based on the type of error
      if (error.message.includes('network')) {
        Alert.alert('Network Error', 'Failed to process the image due to network issues. Please check your connection and try again.');
      } else if (error.message.includes('API')) {
        Alert.alert('API Error', 'There was an issue with the image processing service. Please try again later.');
      } else {
        Alert.alert('Error', 'Failed to process the image. Please try again with a different image.');
      }
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Wrapper for the process image function to use current state
  const processImage = () => {
    if (image) {
      processImageWithUri(image);
    } else {
      Alert.alert('No Image', 'Please select or take a photo first');
    }
  };

  const saveBulkCards = async (cards) => {
    try {
      for (const card of cards) {
        await addCard(card.front, card.back, card.sampleSentence || '');
      }
    } catch (error) {
      console.error('Error saving bulk cards:', error);
      Alert.alert('Error', 'Failed to save cards. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient
          colors={Colors.backgroundGradient as [string, string]}
          style={styles.gradientBackground}
        >
          <ActivityIndicator size="large" color={Colors.primary} />
        </LinearGradient>
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient
          colors={Colors.backgroundGradient as [string, string]}
          style={styles.gradientBackground}
        >
          <Text style={styles.errorText}>Deck not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.backgroundGradient as [string, string]}
        style={styles.gradientBackground}
      >
        <LogoHeader 
          title="Add Cards to Deck" 
          showBackButton={true} 
          showLogo={true} 
          size="small" 
        />

        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
          <Animated.View 
            entering={FadeInDown.duration(300)}
            style={styles.section}
          >
            <View style={styles.sectionHeaderContainer}>
              <View style={[styles.sectionHeader, styles.primaryHeader]}>
                <MaterialIcons name="note-add" size={24} color="#FFFFFF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Add Single Card</Text>
              </View>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Front of card"
              placeholderTextColor={Colors.hint}
              value={front}
              onChangeText={setFront}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Back of card"
              placeholderTextColor={Colors.hint}
              value={back}
              onChangeText={setBack}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Sample sentence (optional)"
              placeholderTextColor={Colors.hint}
              value={sampleSentence}
              onChangeText={setSampleSentence}
              multiline
            />

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="add" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Add Card</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.divider} />

          <Animated.View 
            entering={FadeInDown.duration(300).delay(100)}
            style={styles.section}
          >
            <View style={styles.sectionHeaderContainer}>
              <View style={[styles.sectionHeader, styles.secondaryHeader]}>
                <MaterialIcons name="auto-awesome" size={24} color="#FFFFFF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Bulk Add with AI</Text>
              </View>
            </View>

            <Text style={styles.aiNote}>{AI_FEATURES_NOTE}</Text>

            <Text style={styles.sectionDescription}>
              Enter one word per line. AI will generate definitions automatically.
            </Text>

            <TextInput
              style={[styles.input, styles.bulkInput]}
              placeholder="Enter words (one per line)"
              placeholderTextColor={Colors.hint}
              value={bulkWords}
              onChangeText={setBulkWords}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, isProcessing && styles.buttonDisabled]}
              onPress={handleBulkAdd}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="psychology" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Process Words</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.divider} />

          <Animated.View 
            entering={FadeInDown.duration(300).delay(200)}
            style={styles.section}
          >
            <View style={styles.sectionHeaderContainer}>
              <View style={[styles.sectionHeader, styles.accentHeader]}>
                <MaterialIcons name="image" size={24} color="#FFFFFF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Add from Image</Text>
              </View>
            </View>

            <Text style={styles.aiNote}>{AI_FEATURES_NOTE}</Text>

            <Text style={styles.sectionDescription}>
              Take a photo or upload an image containing underlined words. Our AI will automatically extract the underlined text and create flashcards for you.
            </Text>

            {image && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImage(null)}
                >
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.imageButtonsContainer}>
              <TouchableOpacity
                style={[styles.imageButton, styles.cameraButton]}
                onPress={takePhoto}
              >
                <MaterialIcons name="camera-alt" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.imageButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.imageButton, styles.galleryButton]}
                onPress={pickImage}
              >
                <MaterialIcons name="photo-library" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.imageButtonText}>Choose Image</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark background color
  },
  gradientBackground: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)', // Lighter border for dark mode
  },
  logoHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)', // Lighter border for dark mode
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerRight: {
    width: 40, // To balance the back button
  },
  backButtonSmall: {
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeaderContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryHeader: {
    backgroundColor: Colors.primary,
  },
  secondaryHeader: {
    backgroundColor: Colors.secondary,
  },
  accentHeader: {
    backgroundColor: Colors.accent,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', // Lighter border for dark mode
  },
  bulkInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  accentButton: {
    backgroundColor: Colors.accent,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)', // Lighter divider for dark mode
    marginVertical: 16,
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
    marginBottom: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logo: {
    width: 50,
    height: 50,
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    marginVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', // Lighter border for dark mode
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
  },
  cameraButton: {
    backgroundColor: Colors.secondary,
  },
  galleryButton: {
    backgroundColor: Colors.primaryDark,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginVertical: 8,
    lineHeight: 20,
  },
  aiNote: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 2,
    marginBottom: 8,
    fontWeight: '600',
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});