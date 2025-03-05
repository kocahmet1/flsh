
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { ref, get, update } from 'firebase/database';
import { auth, db } from '../firebase/config';
import { LinearGradient } from 'expo-linear-gradient';
import { isAdmin } from '../utils/authUtils';

const ImportCSV = ({ deckId, onImportComplete }) => {
  // If not admin, don't render anything
  if (!isAdmin()) {
    return null;
  }
  
  const [csvText, setCsvText] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleImport = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('You must be logged in to import cards');
      }

      if (!csvText.trim()) {
        throw new Error('Please enter some data to import');
      }

      // Parse CSV content (word,definition;word,definition)
      const pairs = csvText.split(';').filter(pair => pair.trim());
      const validCards = pairs.map(pair => {
        const [word, definition] = pair.split(',').map(str => str.trim());
        return {
          front: word,
          back: definition,
          createdAt: new Date().toISOString()
        };
      }).filter(card => card.front && card.back);

      if (validCards.length === 0) {
        throw new Error('No valid cards found in the input');
      }

      // Get current deck data
      const deckRef = ref(db, `users/${auth.currentUser.uid}/decks/${deckId}`);
      const snapshot = await get(deckRef);
      
      if (!snapshot.exists()) {
        throw new Error('Deck not found');
      }

      // Prepare cards to add
      const cardsToAdd = {};
      validCards.forEach(card => {
        cardsToAdd[`cards/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`] = card;
      });

      // Update deck with new cards
      await update(deckRef, cardsToAdd);

      Alert.alert(
        'Success',
        `Imported ${validCards.length} cards successfully!`,
        [{ text: 'OK' }]
      );

      // Clear input
      setCsvText('');

      if (onImportComplete) {
        onImportComplete(validCards);
      }

    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to import cards',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.importButton} 
        onPress={() => setShowInput(!showInput)}
      >
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']} 
          style={styles.buttonGradient}
          start={{x: 0, y: 0}} 
          end={{x: 1, y: 0}}
        >
          <Text style={styles.buttonText}>Import Words</Text>
        </LinearGradient>
      </TouchableOpacity>

      {showInput && (
        <View style={styles.inputContainer}>
          <LinearGradient
            colors={['rgba(255,255,255,0.9)', 'rgba(248,250,252,0.95)']}
            style={styles.inputBackground}
          />
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            placeholder="Paste your words and definitions here in format: word,definition;word,definition"
            value={csvText}
            onChangeText={setCsvText}
            textAlignVertical="top"
          />
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleImport}
          >
            <LinearGradient
              colors={['#10B981', '#059669']} 
              style={styles.buttonGradient}
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}}
            >
              <Text style={styles.buttonText}>Submit</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.helpText}>
            Format: word,definition;word,definition;word,definition
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  inputContainer: {
    position: 'relative',
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    paddingBottom: 8,
  },
  inputBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.8)',
    borderRadius: 8,
    padding: 12,
    margin: 12,
    marginBottom: 16,
    minHeight: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  importButton: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  submitButton: {
    marginHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonGradient: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    marginTop: 12,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});

export default ImportCSV;
