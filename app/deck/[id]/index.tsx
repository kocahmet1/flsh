// @ts-nocheck
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDeck } from '../../../src/hooks/useDeck';
import { useDecks } from '../../../src/hooks/useDecks';

const PALETTE = {
  bgTop: '#5567A7',
  bgMid: '#35497E',
  bgBottom: '#171F3F',
  surface: '#FBFCFF',
  surfaceStrong: 'rgba(255,255,255,0.95)',
  border: 'rgba(118, 139, 255, 0.42)',
  shadow: '#0D1431',
  textOnDark: '#F6F8FF',
  textOnDarkMuted: '#D6DCF5',
  text: '#4D55A1',
  textMuted: '#7C84A8',
  track: '#D73A58',
  trackGlow: '#F06A81',
  fillStart: '#5C6BFF',
  fillEnd: '#8376FF',
  fillSolid: '#6170FF',
  successStart: '#1CC97B',
  successEnd: '#39D98A',
  pillBg: '#EEF1FF',
  pillText: '#5A67D7',
  danger: '#D43F5D',
};

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.confirm(message)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

function ProgressRail({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(progress, 100));
  const fillColors =
    clamped >= 100
      ? [PALETTE.fillSolid, PALETTE.fillEnd]
      : [PALETTE.fillStart, PALETTE.fillEnd];

  return (
    <View style={styles.progressRail}>
      <LinearGradient
        colors={[PALETTE.trackGlow, PALETTE.track]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.progressTrack}
      />
      {clamped > 0 ? (
        <LinearGradient
          colors={fillColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.progressFill, { width: `${clamped}%` }]}
        />
      ) : null}
    </View>
  );
}

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { deck, loading, error, deleteCard, refreshDeck } = useDeck(id);
  const { deleteDeck } = useDecks();

  useFocusEffect(
    useCallback(() => {
      refreshDeck();
    }, [refreshDeck])
  );

  if (loading) {
    return (
      <LinearGradient
        colors={[PALETTE.bgTop, PALETTE.bgMid, PALETTE.bgBottom]}
        style={styles.centered}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Opening deck...</Text>
      </LinearGradient>
    );
  }

  if (!deck) {
    return (
      <LinearGradient
        colors={[PALETTE.bgTop, PALETTE.bgMid, PALETTE.bgBottom]}
        style={styles.centered}
      >
        <MaterialCommunityIcons name="alert-circle-outline" size={44} color="#FFFFFF" />
        <Text style={styles.errorTitle}>Deck not found</Text>
        <Text style={styles.errorBody}>{error || 'This deck could not be loaded.'}</Text>
      </LinearGradient>
    );
  }

  const cards = deck.cards || [];
  const totalCards = cards.length;
  const knownCards = cards.filter((card: any) => card.isKnown).length;
  const unknownCards = Math.max(totalCards - knownCards, 0);
  const progress = totalCards ? Math.round((knownCards / totalCards) * 100) : 0;
  const quizReady = totalCards >= 4;

  const handleDeleteCard = (cardId: string) => {
    confirmAction('Delete card?', 'This removes the card from this deck.', () => {
      void deleteCard(cardId);
    });
  };

  const handleDeleteDeck = () => {
    confirmAction(
      'Delete deck?',
      `Delete "${deck.name}" and all of its cards from your account?`,
      () => {
        void (async () => {
          await deleteDeck(deck.id);
          router.replace('/(tabs)');
        })();
      }
    );
  };

  const renderCard = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.cardRow}>
      <View style={styles.cardIndexBubble}>
        <Text style={styles.cardIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.cardRowContent}>
        <Text style={styles.cardFront}>{item.front}</Text>
        <Text style={styles.cardBack}>{item.back}</Text>
        {item.sampleSentence ? (
          <Text style={styles.cardSentence}>{item.sampleSentence}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.deleteCardButton}
        onPress={() => handleDeleteCard(item.id)}
      >
        <MaterialCommunityIcons name="close" size={16} color="#9EA6CB" />
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={[PALETTE.bgTop, PALETTE.bgMid, PALETTE.bgBottom]}
      style={styles.screen}
    >
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.topIconButton} onPress={() => router.back()}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={PALETTE.textOnDark} />
              </TouchableOpacity>

              <View style={styles.topBarTitleWrap}>
                <Text style={styles.topBarTitle} numberOfLines={1}>
                  {deck.name}
                </Text>
                <Text style={styles.topBarSubtitle}>
                  {knownCards} learned - {totalCards} total
                </Text>
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => router.push(`/deck/${id}/add-card`)}
              >
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#D8DDFF" />
                <Text style={styles.editButtonText}>Edit Deck</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroCard}>
              <TouchableOpacity
                style={styles.studyWholeButton}
                onPress={() => router.push(`/deck/${id}/study`)}
                disabled={!totalCards}
              >
                <LinearGradient
                  colors={[PALETTE.successStart, PALETTE.successEnd]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.studyWholeGradient}
                >
                  <MaterialCommunityIcons
                    name="cards-playing-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.studyWholeText}>Study Whole Set</Text>
                </LinearGradient>
              </TouchableOpacity>

              <ProgressRail progress={progress} />

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatChip}>
                  <MaterialCommunityIcons
                    name="book-open-variant"
                    size={16}
                    color={PALETTE.pillText}
                  />
                  <Text style={styles.heroStatChipText}>
                    {knownCards} / {totalCards}
                  </Text>
                </View>
                <View style={styles.heroStatChip}>
                  <MaterialCommunityIcons name="brain" size={16} color={PALETTE.pillText} />
                  <Text style={styles.heroStatChipText}>{unknownCards} still learning</Text>
                </View>
              </View>

              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={[styles.secondaryAction, !unknownCards && styles.disabledAction]}
                  onPress={() =>
                    router.push({
                      pathname: `/deck/${id}/study`,
                      params: { mode: 'unknown' },
                    })
                  }
                  disabled={!unknownCards}
                >
                  <MaterialCommunityIcons name="lightbulb-outline" size={17} color={PALETTE.text} />
                  <Text style={styles.secondaryActionText}>Study Unknown</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryAction, !quizReady && styles.disabledAction]}
                  onPress={() => router.push(`/quiz/${id}`)}
                  disabled={!quizReady}
                >
                  <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={17}
                    color={PALETTE.text}
                  />
                  <Text style={styles.secondaryActionText}>Take Quiz</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => router.push(`/deck/${id}/add-card`)}
                >
                  <MaterialCommunityIcons name="plus-box-outline" size={17} color={PALETTE.text} />
                  <Text style={styles.secondaryActionText}>Add Cards</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Deck Cards</Text>
              <Text style={styles.sectionHint}>Tap Edit Deck to grow this set.</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cards-outline" size={42} color={PALETTE.textOnDark} />
            <Text style={styles.emptyTitle}>No cards yet</Text>
            <Text style={styles.emptyBody}>
              Add your first card and this page will start to feel like the web deck flow again.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push(`/deck/${id}/add-card`)}
            >
              <Text style={styles.emptyButtonText}>Add First Card</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.deleteDeckButton} onPress={handleDeleteDeck}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
            <Text style={styles.deleteDeckText}>Delete Deck</Text>
          </TouchableOpacity>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: PALETTE.textOnDark,
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    color: PALETTE.textOnDark,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 6,
  },
  errorBody: {
    color: PALETTE.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  topIconButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  topBarTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    color: PALETTE.textOnDark,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  topBarSubtitle: {
    color: PALETTE.textOnDarkMuted,
    fontSize: 13,
    marginTop: 3,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(122, 114, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(210, 206, 255, 0.24)',
  },
  editButtonText: {
    color: '#D8DDFF',
    fontSize: 13,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: PALETTE.surfaceStrong,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(226,232,255,0.85)',
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
    marginBottom: 18,
  },
  studyWholeButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  studyWholeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  studyWholeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  progressRail: {
    position: 'relative',
    height: 16,
    justifyContent: 'center',
    marginBottom: 14,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    borderRadius: 999,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    height: 12,
    borderRadius: 999,
    marginLeft: 2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  heroStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: PALETTE.pillBg,
    borderWidth: 1,
    borderColor: '#D6DCFF',
  },
  heroStatChipText: {
    color: PALETTE.pillText,
    fontSize: 13,
    fontWeight: '700',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryAction: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6DCFF',
    backgroundColor: '#F5F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionText: {
    color: PALETTE.text,
    fontSize: 13,
    fontWeight: '700',
  },
  disabledAction: {
    opacity: 0.45,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: PALETTE.textOnDark,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionHint: {
    color: PALETTE.textOnDarkMuted,
    fontSize: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: PALETTE.surface,
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(219,226,255,0.85)',
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardIndexBubble: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#EEF1FF',
    borderWidth: 1,
    borderColor: '#D2D9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIndexText: {
    color: PALETTE.pillText,
    fontSize: 12,
    fontWeight: '800',
  },
  cardRowContent: {
    flex: 1,
    paddingRight: 12,
  },
  cardFront: {
    color: PALETTE.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardBack: {
    color: PALETTE.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  cardSentence: {
    color: PALETTE.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  deleteCardButton: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FF',
    borderWidth: 1,
    borderColor: '#E0E6FF',
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 24,
    paddingVertical: 28,
    marginTop: 8,
  },
  emptyTitle: {
    color: PALETTE.textOnDark,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyBody: {
    color: PALETTE.textOnDarkMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  emptyButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  emptyButtonText: {
    color: PALETTE.pillText,
    fontSize: 13,
    fontWeight: '800',
  },
  deleteDeckButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 16,
    backgroundColor: PALETTE.danger,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteDeckText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
