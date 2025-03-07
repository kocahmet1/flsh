import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useDecks } from '../../src/hooks/useDecks';
import { auth } from '../../src/firebase/config';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

// Modern color palette - matching other components
const Colors = {
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  accent: '#3B82F6', // Blue
  mintGreen: '#00D68F', // Bright mint green
  surface: '#FFFFFF',
  backgroundGradient: ['#F9FAFB', '#F3F4F6'],
  cardShadow: '#000000',
  text: '#111827',
};

export default function CreateNewSet() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { createDeck } = useDecks();

  const handleCreateSet = async () => {
    if (!name.trim()) {
      setError('Please enter a set name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newSet = await createDeck(name.trim());
      console.log('New set created:', newSet);
      setName('');

      if (newSet && newSet.id) {
        console.log('Navigating to set with ID:', newSet.id);
        // Ensure the ID is a string
        const setId = String(newSet.id);
        router.push({
          pathname: `/deck/${setId}`,
        });
      } else {
        console.error('Failed to get set ID from created set:', newSet);
        setError('Failed to create set. Please try again.');
      }
    } catch (error) {
      console.error('Error creating set:', error);
      setError('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Set</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Enter set name"
        placeholderTextColor="#666"
        editable={!loading}
      />
      <TouchableOpacity
        style={[styles.createButton, loading ? styles.buttonDisabled : null]}
        onPress={handleCreateSet}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <MaterialIcons name="add" size={24} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Create New Set</Text>
          </>
        )}
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
    color: Colors.text,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 30,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: Colors.mintGreen,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    minHeight: 52,
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});