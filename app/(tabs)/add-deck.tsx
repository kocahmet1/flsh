import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useDecks } from '../../src/hooks/useDecks';
import { auth } from '../../src/firebase/config';

export default function AddDeck() {
  const [newDeckName, setNewDeckName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createDeck } = useDecks();

  const handleCreateDeck = async () => {
    if (newDeckName.trim()) {
      try {
        setIsSubmitting(true);
        const newDeck = await createDeck(newDeckName.trim());
        console.log('New deck created:', newDeck);
        setNewDeckName('');

        if (newDeck && newDeck.id) {
          console.log('Navigating to deck with ID:', newDeck.id);
          // Ensure the ID is a string
          const deckId = String(newDeck.id);
          router.push({
            pathname: `/deck/${deckId}`,
          });
        } else {
          console.error('Failed to get deck ID from created deck:', newDeck);
          Alert.alert('Error', 'Failed to create deck. Please try again.');
        }
      } catch (error) {
        console.error('Error creating deck:', error);
        Alert.alert('Error', 'Failed to create deck. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      Alert.alert('Error', 'Please enter a deck name.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Deck</Text>
      <TextInput
        style={styles.input}
        value={newDeckName}
        onChangeText={setNewDeckName}
        placeholder="Enter deck name"
        placeholderTextColor="#666"
        editable={!isSubmitting}
      />
      <TouchableOpacity
        style={[styles.circleButton, isSubmitting && styles.buttonDisabled]}
        onPress={handleCreateDeck}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>
          {isSubmitting ? 'Creating...' : 'Create Deck'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButton: {
    backgroundColor: '#007BFF',
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});