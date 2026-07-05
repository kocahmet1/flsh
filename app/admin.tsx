// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { get, onValue, push, ref, remove, set } from 'firebase/database';
import { db } from '../src/firebase/config';
import { useAuth } from '../src/context/AuthContext';

const COLORS = {
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2FF',
  border: '#DCE3F4',
  text: '#16213E',
  muted: '#66708F',
  primary: '#5365F6',
  danger: '#DC2626',
  success: '#059669',
};

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

function getCards(deck: any) {
  if (!deck?.cards) return [];
  return Array.isArray(deck.cards) ? deck.cards : Object.values(deck.cards);
}

export default function AdminScreen() {
  const router = useRouter();
  const { user, isAdmin, initializing } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [userRecords, setUserRecords] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesError, setProfilesError] = useState('');
  const [query, setQuery] = useState('');
  const [manualUid, setManualUid] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [decks, setDecks] = useState([]);
  const [decksLoading, setDecksLoading] = useState(false);
  const [adminDecks, setAdminDecks] = useState([]);
  const [adminDecksLoading, setAdminDecksLoading] = useState(false);
  const [selectedSourceDeckId, setSelectedSourceDeckId] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!initializing && !isAdmin) {
      router.replace('/(tabs)/settings');
    }
  }, [initializing, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !db) return undefined;

    setProfilesLoading(true);
    let profilesLoaded = false;
    let usersLoaded = false;

    const markLoaded = () => {
      if (profilesLoaded && usersLoaded) {
        setProfilesLoading(false);
      }
    };

    const profilesRef = ref(db, 'userProfiles');
    const usersRef = ref(db, 'users');

    const unsubscribeProfiles = onValue(
      profilesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        setProfiles(
          Object.entries(data).map(([uid, profile]) => ({
            uid,
            source: 'profile',
            ...profile,
          }))
        );
        profilesLoaded = true;
        setProfilesError('');
        markLoaded();
      },
      (error) => {
        profilesLoaded = true;
        setProfilesError(error?.message || 'Could not load user profiles.');
        markLoaded();
      }
    );

    const unsubscribeUsers = onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        setUserRecords(
          Object.entries(data).map(([uid, record]) => ({
            uid,
            source: 'users',
            deckCount: record?.decks ? Object.keys(record.decks).length : 0,
          }))
        );
        usersLoaded = true;
        markLoaded();
      },
      (error) => {
        usersLoaded = true;
        setProfilesError(error?.message || 'Could not load existing users.');
        markLoaded();
      }
    );

    return () => {
      unsubscribeProfiles();
      unsubscribeUsers();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !selectedUser?.uid || !db) {
      setDecks([]);
      return undefined;
    }

    setDecksLoading(true);
    const decksRef = ref(db, `users/${selectedUser.uid}/decks`);
    const unsubscribe = onValue(
      decksRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const nextDecks = Object.entries(data)
          .map(([id, deck]) => ({
            id,
            ...deck,
          }))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        setDecks(nextDecks);
        setDecksLoading(false);
      },
      (error) => {
        setStatus(error?.message || 'Could not load decks for this user.');
        setDecks([]);
        setDecksLoading(false);
      }
    );

    return unsubscribe;
  }, [isAdmin, selectedUser?.uid]);

  useEffect(() => {
    if (!isAdmin || !user?.uid || !db) {
      setAdminDecks([]);
      return undefined;
    }

    setAdminDecksLoading(true);
    const adminDecksRef = ref(db, `users/${user.uid}/decks`);
    const unsubscribe = onValue(
      adminDecksRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const nextDecks = Object.entries(data)
          .map(([id, deck]) => ({
            id,
            ...deck,
          }))
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

        setAdminDecks(nextDecks);
        setAdminDecksLoading(false);
      },
      (error) => {
        setStatus(error?.message || 'Could not load your decks.');
        setAdminDecks([]);
        setAdminDecksLoading(false);
      }
    );

    return unsubscribe;
  }, [isAdmin, user?.uid]);

  const allUsers = useMemo(() => {
    const byUid = new Map();

    userRecords.forEach((record) => {
      byUid.set(record.uid, {
        uid: record.uid,
        email: '',
        displayName: '',
        deckCount: record.deckCount || 0,
        hasAccountData: true,
      });
    });

    profiles.forEach((profile) => {
      const existing = byUid.get(profile.uid) || {};
      byUid.set(profile.uid, {
        ...existing,
        ...profile,
        uid: profile.uid,
        deckCount: existing.deckCount || profile.deckCount || 0,
        hasProfile: true,
      });
    });

    return Array.from(byUid.values()).sort((a, b) => {
      const aLabel = String(a.email || a.displayName || a.uid || '');
      const bLabel = String(b.email || b.displayName || b.uid || '');
      return aLabel.localeCompare(bLabel);
    });
  }, [profiles, userRecords]);

  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allUsers;

    return allUsers.filter((profile) => {
      const haystack = `${profile.email || ''} ${profile.displayName || ''} ${profile.uid || ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [allUsers, query]);

  const selectManualUid = async () => {
    const uid = manualUid.trim();
    if (!uid) {
      setStatus('Paste a Firebase UID first.');
      return;
    }

    const matchingProfile = allUsers.find((profile) => profile.uid === uid);
    if (matchingProfile) {
      setSelectedUser(matchingProfile);
      return;
    }

    try {
      const profileSnap = await get(ref(db, `userProfiles/${uid}`));
      const profile = profileSnap.exists() ? profileSnap.val() : {};
      setSelectedUser({
        uid,
        email: profile.email || '',
        displayName: profile.displayName || 'Manual UID',
      });
    } catch {
      setSelectedUser({ uid, email: '', displayName: 'Manual UID' });
    }
  };

  const copySelectedDeckToUser = async () => {
    if (!selectedUser?.uid) {
      setStatus('Select a user first.');
      return;
    }

    const sourceDeck = adminDecks.find((deck) => deck.id === selectedSourceDeckId);
    if (!sourceDeck) {
      setStatus('Choose one of your decks first.');
      return;
    }

    setSaving(true);
    setStatus('');

    try {
      const now = new Date().toISOString();
      const userDecksRef = ref(db, `users/${selectedUser.uid}/decks`);
      const newDeckRef = push(userDecksRef);
      const deckId = newDeckRef.key;
      const cards = {};
      const sourceCards = getCards(sourceDeck);

      sourceCards.forEach((card) => {
        const cardId = push(ref(db, `users/${selectedUser.uid}/decks/${deckId}/cards`)).key;
        const { _dbId, id: _oldId, ...cardData } = card || {};
        cards[cardId] = {
          ...cardData,
          id: cardId,
          front: cardData.front || '',
          back: cardData.back || '',
          sampleSentence: cardData.sampleSentence || '',
          isKnown: false,
          lastReviewed: null,
          createdAt: cardData.createdAt || now,
          createdByAdmin: true,
        };
      });

      await set(newDeckRef, {
        id: deckId,
        name: sourceDeck.name || 'Untitled Set',
        createdAt: now,
        creatorId: selectedUser.uid,
        creatorName: selectedUser.displayName || selectedUser.email || 'User',
        isShared: false,
        createdByAdmin: true,
        administeredBy: user.uid,
        administeredByEmail: user.email || '',
        administeredAt: now,
        copiedFromDeckId: sourceDeck.id,
        copiedFromDeckName: sourceDeck.name || 'Untitled Set',
        cards,
      });

      setSelectedSourceDeckId('');
      notify('Deck added', `Added "${sourceDeck.name || 'Untitled Set'}" to ${selectedUser.email || selectedUser.uid}.`);
    } catch (error) {
      setStatus(error?.message || 'Failed to copy deck.');
    } finally {
      setSaving(false);
    }
  };

  const deleteDeckForSelectedUser = async (deck) => {
    if (!selectedUser?.uid || !deck?.id) return;

    confirmAction('Delete deck?', `Delete "${deck.name}" from this user's account?`, async () => {
      try {
        await remove(ref(db, `users/${selectedUser.uid}/decks/${deck.id}`));
        setStatus(`Deleted "${deck.name}".`);
      } catch (error) {
        setStatus(error?.message || 'Failed to delete deck.');
      }
    });
  };

  const deleteDatabaseUserRecord = async (profile) => {
    if (!profile?.uid) return;

    const label = profile.email || profile.displayName || profile.uid;
    confirmAction(
      'Remove database user?',
      `Remove "${label}" from Realtime Database? This deletes /users/${profile.uid}, /userProfiles/${profile.uid}, and all decks stored there. It does not affect Firebase Authentication.`,
      async () => {
        try {
          await Promise.all([
            remove(ref(db, `users/${profile.uid}`)),
            remove(ref(db, `userProfiles/${profile.uid}`)),
          ]);

          if (selectedUser?.uid === profile.uid) {
            setSelectedUser(null);
            setDecks([]);
          }

          setStatus(`Removed database record for ${label}.`);
        } catch (error) {
          setStatus(error?.message || 'Failed to remove database user record.');
        }
      }
    );
  };

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="lock-alert-outline" size={42} color={COLORS.danger} />
        <Text style={styles.lockTitle}>Admin access required</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="shield-account-outline" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Admin Console</Text>
          <Text style={styles.subtitle}>Add and remove vocab sets inside user accounts.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Users</Text>
          <Text style={styles.countText}>{filteredProfiles.length} shown</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Search by email, name, or UID"
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.manualRow}>
          <TextInput
            style={[styles.input, styles.manualInput]}
            placeholder="Paste UID for legacy accounts"
            placeholderTextColor={COLORS.muted}
            value={manualUid}
            onChangeText={setManualUid}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.secondaryButton} onPress={selectManualUid}>
            <Text style={styles.secondaryButtonText}>Use UID</Text>
          </TouchableOpacity>
        </View>

        {profilesLoading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : profilesError ? (
          <Text style={styles.errorText}>{profilesError}</Text>
        ) : (
          <View style={styles.userList}>
            {filteredProfiles.slice(0, 20).map((profile) => {
              const selected = selectedUser?.uid === profile.uid;
              const label = profile.email || profile.displayName || 'Legacy user';
              return (
                <View
                  key={profile.uid}
                  style={[styles.userRow, selected && styles.userRowSelected]}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {(label || profile.uid || '?').slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userMeta}>
                    <Text style={styles.userName}>{label}</Text>
                    <Text style={styles.userUid} numberOfLines={1}>
                      {profile.uid}
                    </Text>
                    <Text style={styles.userDeckCount}>
                      {profile.deckCount || 0} existing sets
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.selectButton, selected && styles.selectButtonActive]}
                    onPress={() => {
                      setSelectedUser(profile);
                      setStatus('');
                    }}
                  >
                    {selected ? (
                      <MaterialCommunityIcons name="check-circle" size={16} color="#FFFFFF" />
                    ) : null}
                    <Text style={[styles.selectButtonText, selected && styles.selectButtonTextActive]}>
                      {selected ? 'Selected' : 'Select'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeUserButton}
                    onPress={() => deleteDatabaseUserRecord(profile)}
                  >
                    <MaterialCommunityIcons name="database-remove-outline" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              );
            })}
            {filteredProfiles.length > 20 ? (
              <Text style={styles.helperText}>Showing first 20 matches. Search to narrow the list.</Text>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Selected Account</Text>
        {selectedUser ? (
          <>
            <Text style={styles.selectedPrimary}>{selectedUser.email || selectedUser.displayName || 'Manual UID'}</Text>
            <Text selectable style={styles.selectedUid}>{selectedUser.uid}</Text>
          </>
        ) : (
          <Text style={styles.emptyText}>Select a user before adding or deleting sets.</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Add One of My Sets</Text>
          {adminDecksLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
        </View>
        <Text style={styles.helperText}>
          Choose one of your existing decks. It will be copied into the selected user's account with learning progress reset.
        </Text>
        {adminDecks.length ? (
          <View style={styles.sourceDeckList}>
            {adminDecks.map((deck) => {
              const selected = selectedSourceDeckId === deck.id;
              const cards = getCards(deck);
              return (
                <TouchableOpacity
                  key={deck.id}
                  style={[styles.sourceDeckRow, selected && styles.sourceDeckRowSelected]}
                  onPress={() => setSelectedSourceDeckId(deck.id)}
                >
                  <View style={styles.sourceDeckMeta}>
                    <Text style={styles.sourceDeckName}>{deck.name || 'Untitled Set'}</Text>
                    <Text style={styles.deckInfo}>{cards.length} cards</Text>
                  </View>
                  <View style={[styles.radioMark, selected && styles.radioMarkSelected]}>
                    {selected ? <MaterialCommunityIcons name="check" size={15} color="#FFFFFF" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>No decks found in your admin account yet.</Text>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={copySelectedDeckToUser}
          disabled={saving || !selectedUser || !selectedSourceDeckId}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-copy" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Copy Selected Set to User</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>User Sets</Text>
          {decksLoading ? <ActivityIndicator color={COLORS.primary} /> : null}
        </View>
        {!selectedUser ? (
          <Text style={styles.emptyText}>No user selected.</Text>
        ) : decks.length ? (
          decks.map((deck) => {
            const cards = getCards(deck);
            return (
              <View key={deck.id} style={styles.deckRow}>
                <View style={styles.deckMeta}>
                  <Text style={styles.deckName}>{deck.name || 'Untitled Set'}</Text>
                  <Text style={styles.deckInfo}>
                    {cards.length} cards - {deck.createdByAdmin ? 'admin added' : 'user created'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteDeckForSelectedUser(deck)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>This user has no sets yet.</Text>
        )}
      </View>

      {status ? <Text style={styles.statusText}>{status}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 34,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
  },
  lockTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 3,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFF',
    color: COLORS.text,
    paddingHorizontal: 13,
    fontSize: 14,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    flex: 1,
  },
  secondaryButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  userList: {
    gap: 8,
  },
  userRow: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
  },
  userRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F3FF',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  userUid: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  userDeckCount: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  selectButton: {
    minHeight: 38,
    minWidth: 86,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
  },
  selectButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  selectButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  selectButtonTextActive: {
    color: '#FFFFFF',
  },
  removeUserButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
  },
  selectedPrimary: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  selectedUid: {
    color: COLORS.muted,
    fontSize: 12,
  },
  bulkInput: {
    minHeight: 150,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFF',
    color: COLORS.text,
    padding: 13,
    fontSize: 14,
    lineHeight: 20,
  },
  sourceDeckList: {
    gap: 8,
  },
  sourceDeckRow: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sourceDeckRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F3FF',
  },
  sourceDeckMeta: {
    flex: 1,
    minWidth: 0,
  },
  sourceDeckName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  radioMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioMarkSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAFBFF',
  },
  deckMeta: {
    flex: 1,
    minWidth: 0,
  },
  deckName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  deckInfo: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  statusText: {
    color: COLORS.text,
    fontSize: 13,
    textAlign: 'center',
  },
});
