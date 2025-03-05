import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { auth } from '../../src/firebase/config'; // Import from the correct path

function DeckCard({ deck, onPress }) {
  const isAdmin = auth.currentUser?.email === 'ahmetkoc1@gmail.com';

  return (
    <TouchableOpacity style={styles.deckCard} onPress={onPress}>
      <Text style={styles.deckName}>{deck.name}</Text>
      <Text style={styles.deckCreator}>Created by: {deck.creatorName || 'Unknown'}</Text>
      <Text style={styles.cardCount}>
        {deck.cards ? (Array.isArray(deck.cards) ? deck.cards.length : Object.keys(deck.cards).length) : 0} cards
      </Text>

      {isAdmin && deck.autoForkForAll && (
        <View style={styles.autoForkBadge}>
          <Text style={styles.autoForkText}>Auto-Fork Enabled</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  deckCard: {
    //Existing styles for deckCard
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  deckName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  deckCreator: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
  },
  cardCount: {
    fontSize: 14,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  autoForkBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  autoForkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default DeckCard;