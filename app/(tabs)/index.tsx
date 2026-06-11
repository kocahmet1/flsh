// @ts-nocheck
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDecks } from '../../src/hooks/useDecks';
import { useTracking } from '../../src/hooks/useTracking';

const PALETTE = {
  bgTop: '#5567A7',
  bgMid: '#35497E',
  bgBottom: '#171F3F',
  surface: '#FBFCFF',
  surfaceMuted: 'rgba(255,255,255,0.16)',
  surfaceStrong: 'rgba(255,255,255,0.94)',
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
  emptyBorder: 'rgba(255,255,255,0.18)',
};

function getCards(deck: any) {
  if (!deck?.cards) return [];
  return Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards);
}

function formatMinutes(minutes: number) {
  if (!minutes) return '0m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

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

function EmptyPanel({
  icon,
  title,
  body,
  ctaLabel,
  onPress,
}: {
  icon: string;
  title: string;
  body: string;
  ctaLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.emptyPanel}>
      <MaterialCommunityIcons name={icon} size={38} color={PALETTE.textOnDark} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {ctaLabel && onPress ? (
        <TouchableOpacity style={styles.emptyButton} onPress={onPress}>
          <Text style={styles.emptyButtonText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'sets' | 'quizzes' | 'progress'>('sets');
  const { decks, loading, error, refreshDecks, deleteDeck } = useDecks();
  const {
    stats,
    getStudySummary,
    getQuizAccuracy,
    refreshStats,
  } = useTracking();

  useFocusEffect(
    useCallback(() => {
      refreshDecks?.();
      refreshStats?.();
    }, [refreshDecks, refreshStats])
  );

  const summary = getStudySummary?.() || {
    totalStudySessions: 0,
    totalQuizzesTaken: 0,
    totalQuestionsSolved: 0,
    currentStreak: 0,
    totalTimeMinutes: 0,
    recentQuizzes: [],
  };
  const quizAccuracy = getQuizAccuracy?.() || 0;

  const deckSummaries = useMemo(
    () =>
      decks.map((deck: any) => {
        const cards = getCards(deck);
        const totalCards = cards.length;
        const knownCards = cards.filter((card: any) => card.isKnown).length;
        const unknownCards = Math.max(totalCards - knownCards, 0);
        const progress = totalCards ? Math.round((knownCards / totalCards) * 100) : 0;
        const tracking = stats?.deckStats?.[deck.id] || {};

        return {
          ...deck,
          totalCards,
          knownCards,
          unknownCards,
          progress,
          quizReady: totalCards >= 4,
          studyCount: tracking.studyCount || 0,
          quizzesTaken: tracking.quizzesTaken || 0,
          timeSpentMinutes: tracking.timeSpentMinutes || 0,
        };
      }),
    [decks, stats]
  );

  const quizReadyDecks = useMemo(
    () => deckSummaries.filter((deck) => deck.quizReady),
    [deckSummaries]
  );
  const progressDecks = useMemo(
    () =>
      [...deckSummaries].sort(
        (a, b) =>
          b.progress - a.progress ||
          b.studyCount - a.studyCount ||
          a.name.localeCompare(b.name)
      ),
    [deckSummaries]
  );

  const handleDeleteDeck = (deck: any) => {
    confirmAction(
      'Delete deck?',
      `Delete "${deck.name}" and all of its cards from this device?`,
      () => {
        void deleteDeck(deck.id);
      }
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.pageHeader}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons
            name="cards-outline"
            size={24}
            color={PALETTE.textOnDark}
          />
          <Text style={styles.pageTitle}>My Vocab Sets</Text>
        </View>
        <TouchableOpacity style={styles.headerCta} onPress={() => router.push('/add-deck')}>
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.headerCtaText}>New Deck</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segmentRailWrap}>
        {[
          { key: 'sets', label: 'My Sets', icon: 'cards-outline' },
          { key: 'quizzes', label: 'Quizzes', icon: 'help-circle-outline' },
          { key: 'progress', label: 'Progress', icon: 'chart-line' },
        ].map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.segmentButton, selected && styles.segmentButtonActive]}
              onPress={() => setActiveTab(tab.key as 'sets' | 'quizzes' | 'progress')}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={20}
                color={selected ? PALETTE.pillText : '#B6BCD8'}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  selected && styles.segmentButtonTextActive,
                ]}
              >
                {tab.label}
              </Text>
              {selected ? <View style={styles.segmentUnderline} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  const renderSetCards = () => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading your sets...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <EmptyPanel
          icon="alert-circle-outline"
          title="Could not load your sets"
          body={error}
        />
      );
    }

    if (!deckSummaries.length) {
      return (
        <EmptyPanel
          icon="cards-outline"
          title="No sets yet"
          body="Create your first deck and it will appear here with the same progress layout as the web app."
          ctaLabel="Create First Deck"
          onPress={() => router.push('/add-deck')}
        />
      );
    }

    return deckSummaries.map((deck) => (
      <TouchableOpacity
        key={deck.id}
        activeOpacity={0.94}
        style={styles.deckCard}
        onPress={() => router.push(`/deck/${deck.id}`)}
      >
        <TouchableOpacity
          style={styles.deckDeleteButton}
          onPress={(event) => {
            event.stopPropagation?.();
            handleDeleteDeck(deck);
          }}
        >
          <MaterialCommunityIcons name="close" size={14} color="#A2A8C8" />
        </TouchableOpacity>

        <Text style={styles.deckName}>{deck.name}</Text>
        <ProgressRail progress={deck.progress} />

        <View style={styles.deckMetaRow}>
          <Text style={styles.deckMetaText}>
            {deck.knownCards} of {deck.totalCards} words learned
          </Text>
          <Text style={styles.deckPercentText}>{deck.progress}%</Text>
        </View>
      </TouchableOpacity>
    ));
  };

  const renderQuizTab = () => (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Quiz Snapshot</Text>
        <Text style={styles.heroTitle}>Keep the test mode close to the deck list.</Text>
        <Text style={styles.heroBody}>
          The older web flow surfaced quiz progress right beside your sets. This keeps that same feel while using local data.
        </Text>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{summary.totalQuizzesTaken || 0}</Text>
            <Text style={styles.metricLabel}>Quizzes taken</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{quizAccuracy}%</Text>
            <Text style={styles.metricLabel}>Accuracy</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{summary.totalQuestionsSolved || 0}</Text>
            <Text style={styles.metricLabel}>Questions solved</Text>
          </View>
        </View>
      </View>

      {quizReadyDecks.length ? (
        quizReadyDecks.map((deck) => (
          <View key={deck.id} style={styles.supportCard}>
            <View style={styles.supportCardHeader}>
              <View>
                <Text style={styles.supportCardTitle}>{deck.name}</Text>
                <Text style={styles.supportCardMeta}>
                  {deck.totalCards} cards available for quiz mode
                </Text>
              </View>
              <TouchableOpacity
                style={styles.inlineAction}
                onPress={() => router.push(`/quiz/${deck.id}`)}
              >
                <Text style={styles.inlineActionText}>Start Quiz</Text>
              </TouchableOpacity>
            </View>
            <ProgressRail progress={deck.progress} />
          </View>
        ))
      ) : (
        <EmptyPanel
          icon="help-circle-outline"
          title="No quiz-ready decks yet"
          body="Quizzes unlock once a deck has at least 4 cards. Add a few more cards to any set and it will appear here."
        />
      )}
    </>
  );

  const renderProgressTab = () => (
    <>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Progress</Text>
        <Text style={styles.heroTitle}>Track the same signals the web app emphasized.</Text>
        <Text style={styles.heroBody}>
          Streak, study time, and deck completion stay visible without switching away from your sets.
        </Text>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{summary.currentStreak || 0}</Text>
            <Text style={styles.metricLabel}>Day streak</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{summary.totalStudySessions || 0}</Text>
            <Text style={styles.metricLabel}>Study sessions</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatMinutes(summary.totalTimeMinutes || 0)}</Text>
            <Text style={styles.metricLabel}>Study time</Text>
          </View>
        </View>
      </View>

      {progressDecks.length ? (
        progressDecks.map((deck) => (
          <TouchableOpacity
            key={deck.id}
            activeOpacity={0.94}
            style={styles.supportCard}
            onPress={() => router.push(`/deck/${deck.id}`)}
          >
            <View style={styles.supportCardHeader}>
              <View>
                <Text style={styles.supportCardTitle}>{deck.name}</Text>
                <Text style={styles.supportCardMeta}>
                  {deck.studyCount} study sessions - {deck.quizzesTaken} quizzes
                </Text>
              </View>
              <Text style={styles.supportCardBadge}>{deck.progress}%</Text>
            </View>
            <ProgressRail progress={deck.progress} />
            <Text style={styles.supportCardCaption}>
              {deck.knownCards} known - {deck.unknownCards} still learning
            </Text>
          </TouchableOpacity>
        ))
      ) : (
        <EmptyPanel
          icon="chart-line"
          title="No progress yet"
          body="Study a deck or complete a quiz and your progress cards will appear here."
        />
      )}
    </>
  );

  return (
    <LinearGradient
      colors={[PALETTE.bgTop, PALETTE.bgMid, PALETTE.bgBottom]}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {renderHeader()}
        {activeTab === 'sets' ? renderSetCards() : null}
        {activeTab === 'quizzes' ? renderQuizTab() : null}
        {activeTab === 'progress' ? renderProgressTab() : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  pageTitle: {
    color: PALETTE.textOnDark,
    fontSize: 24,
    fontWeight: '800',
    marginLeft: 10,
  },
  headerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(133, 122, 255, 0.26)',
    borderWidth: 1,
    borderColor: 'rgba(202, 195, 255, 0.38)',
  },
  headerCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  segmentRailWrap: {
    flexDirection: 'row',
    backgroundColor: PALETTE.surfaceStrong,
    borderRadius: 24,
    padding: 10,
    gap: 8,
    marginBottom: 18,
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  segmentButton: {
    flex: 1,
    minHeight: 76,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  segmentButtonActive: {
    backgroundColor: PALETTE.pillBg,
    borderWidth: 1,
    borderColor: '#CDD4FF',
    shadowColor: '#ABB4FF',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  segmentButtonText: {
    color: '#A7AEC9',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },
  segmentButtonTextActive: {
    color: PALETTE.pillText,
  },
  segmentUnderline: {
    position: 'absolute',
    bottom: 8,
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#7080FF',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 54,
  },
  loadingText: {
    color: PALETTE.textOnDark,
    fontSize: 14,
    marginTop: 12,
  },
  deckCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: PALETTE.border,
    shadowColor: '#24336A',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  deckDeleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FF',
    borderWidth: 1,
    borderColor: '#E0E6FF',
    zIndex: 1,
  },
  deckName: {
    color: PALETTE.text,
    fontSize: 24,
    fontWeight: '700',
    paddingRight: 28,
    marginBottom: 12,
  },
  progressRail: {
    position: 'relative',
    height: 16,
    justifyContent: 'center',
    marginBottom: 10,
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
  deckMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckMetaText: {
    color: PALETTE.textMuted,
    fontSize: 15,
  },
  deckPercentText: {
    color: PALETTE.text,
    fontSize: 15,
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
    marginBottom: 14,
  },
  heroEyebrow: {
    color: PALETTE.pillText,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heroTitle: {
    color: PALETTE.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 10,
  },
  heroBody: {
    color: PALETTE.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F2F5FF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E1E7FF',
  },
  metricValue: {
    color: PALETTE.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    color: PALETTE.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  supportCard: {
    backgroundColor: PALETTE.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(219,226,255,0.85)',
    shadowColor: PALETTE.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  supportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  supportCardTitle: {
    color: PALETTE.text,
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  supportCardMeta: {
    color: PALETTE.textMuted,
    fontSize: 13,
  },
  inlineAction: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.pillBg,
    borderWidth: 1,
    borderColor: '#CFD6FF',
  },
  inlineActionText: {
    color: PALETTE.pillText,
    fontSize: 12,
    fontWeight: '800',
  },
  supportCardBadge: {
    color: PALETTE.pillText,
    fontSize: 14,
    fontWeight: '800',
  },
  supportCardCaption: {
    color: PALETTE.textMuted,
    fontSize: 13,
    marginTop: 10,
  },
  emptyPanel: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: PALETTE.emptyBorder,
    backgroundColor: PALETTE.surfaceMuted,
    paddingHorizontal: 20,
    paddingVertical: 28,
    marginTop: 6,
  },
  emptyTitle: {
    color: PALETTE.textOnDark,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    color: PALETTE.textOnDarkMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 18,
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
});
