import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useDeck } from '../../../src/hooks/useDeck';
import { generateDefinitions } from '../../../src/utils/gemini';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// Modern color palette - matching other components
const Colors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#EC4899', // Pink
  secondaryLight: '#F472B6',
  accent: '#3B82F6', // Blue
  surface: '#FFFFFF',
  surfaceAlt: '#F8F8FF',
  backgroundGradient: ['#F9FAFB', '#F3F4F6'],
  cardShadow: '#000000',
  text: '#111827',
  textSecondary: '#4B5563',
  hint: '#6B7280',
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
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      alert('Please fill in both sides of the card');
      return;
    }

    try {
      setIsSaving(true);
      await addCard(front.trim(), back.trim());
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

      const wordDefinitions = await generateDefinitions(words);

      // Add each word-definition pair as a card
      for (const [word, definition] of wordDefinitions) {
        await addCard(word, definition);
      }

      alert(`Successfully added ${wordDefinitions.length} cards!`);
      router.back();
    } catch (error) {
      console.error('Error processing bulk words:', error);
      alert('Failed to process words. Please check your API key and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <LinearGradient
          colors={Colors.backgroundGradient}
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
          colors={Colors.backgroundGradient}
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
        colors={Colors.backgroundGradient}
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
              <View style={styles.sectionHeader}>
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
              <View style={[styles.sectionHeader, styles.sectionHeaderSecondary]}>
                <MaterialIcons name="auto-awesome" size={24} color="#FFFFFF" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Bulk Add with AI</Text>
              </View>
            </View>

            <Text style={styles.description}>
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
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeaderSecondary: {
    backgroundColor: Colors.secondary,
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
    borderColor: 'rgba(0,0,0,0.05)',
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
    backgroundColor: 'rgba(0,0,0,0.05)',
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
});