import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useDeck } from '../../../src/hooks/useDeck';

export default function SelectModeScreen() {
  const { id } = useLocalSearchParams();
  const { deck, loading } = useDeck(id);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>Deck not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalCards = deck.cards?.length || 0;
  const knownCards = deck.cards?.filter(card => card.isKnown)?.length || 0;
  const unknownCards = totalCards - knownCards;

  const startStudy = (mode) => {
    // If there are no cards to study in unknown mode, show a message
    if (mode === 'unknown' && unknownCards === 0) {
      Alert.alert(
        'No Cards to Study',
        'All cards in this deck have been marked as known. Would you like to study the complete deck instead?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Study Complete Deck',
            onPress: () => router.push({
              pathname: `/deck/${id}/study`,
              params: { mode: 'all' }
            })
          }
        ]
      );
      return;
    }

    router.push({
      pathname: `/deck/${id}/study`,
      params: { mode }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{deck.name}</Text>
        <Text style={styles.subtitle}>Select Study Mode</Text>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Total cards: {totalCards}</Text>
        <Text style={styles.statsText}>Known cards: {knownCards}</Text>
        <Text style={styles.statsText}>Cards to learn: {unknownCards}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.modeButton, styles.allButton]}
          onPress={() => startStudy('all')}
        >
          <Text style={styles.buttonText}>Practice Complete Deck</Text>
          <Text style={styles.buttonSubtext}>{totalCards} cards</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, styles.unknownButton]}
          onPress={() => startStudy('unknown')}
          disabled={unknownCards === 0}
        >
          <Text style={styles.buttonText}>Practice Unchecked Words</Text>
          <Text style={styles.buttonSubtext}>{unknownCards} cards</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statsText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  buttonContainer: {
    gap: 16,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'center',
  },
  modeButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
    minHeight: 80,
    minWidth: Platform.OS === 'web' ? 200 : '100%',
    maxWidth: Platform.OS === 'web' ? 220 : '100%',
  },
  allButton: {
    backgroundColor: '#4285F4',
  },
  unknownButton: {
    backgroundColor: '#F06292',
    opacity: (props) => (props.disabled ? 0.5 : 1),
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
});