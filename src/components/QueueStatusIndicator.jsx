import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import queueManager from '../utils/cardProcessingQueue';

/**
 * A floating indicator that shows the background processing queue status
 */
export default function QueueStatusIndicator() {
  const [status, setStatus] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [activities, setActivities] = useState([]);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // Subscribe to queue updates
    const handleUpdate = (update) => {
      if (!isMounted) return; // Prevent updates after unmount
      
      if (update.type === 'activity') {
        // Add new activity to the list
        setActivities(prev => {
          const newActivities = [...prev, {
            id: `${update.timestamp}_${Math.random()}`,
            ...update
          }];
          // Keep only last 50 activities
          return newActivities.slice(-50);
        });
        
        // Auto-expand when first activity comes in
        setExpanded(true);
        
        // Auto-scroll to bottom when new activity comes
        setTimeout(() => {
          if (isMounted) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }
        }, 100);
      } else if (update.type === 'status' || !update.type) {
        // Regular status update
        setStatus(update);
        
        // Auto-expand when processing starts
        if (update.isProcessing) {
          setExpanded(true);
        }
      }
    };

    queueManager.addListener(handleUpdate);

    // Cleanup
    return () => {
      isMounted = false;
      queueManager.removeListener(handleUpdate);
    };
  }, []);

  // Don't show if queue is empty and not processing
  if (!status || (status.total === 0 && !status.isProcessing)) {
    return null;
  }

  const { total, pending, processing, failed, completed, isProcessing } = status;
  // completed is now tracked directly from the queue manager

  // Get color and icon for activity type
  const getActivityStyle = (activityType) => {
    const styles = {
      definition_start: { color: '#60A5FA', icon: 'edit', bg: 'rgba(96, 165, 250, 0.1)' },
      definition_done: { color: '#3B82F6', icon: 'check-circle', bg: 'rgba(59, 130, 246, 0.1)' },
      sentence_done: { color: '#8B5CF6', icon: 'format-quote', bg: 'rgba(139, 92, 246, 0.1)' },
      image_start: { color: '#F59E0B', icon: 'image', bg: 'rgba(245, 158, 11, 0.1)' },
      image_done: { color: '#10B981', icon: 'photo', bg: 'rgba(16, 185, 129, 0.1)' },
      image_failed: { color: '#94A3B8', icon: 'image-not-supported', bg: 'rgba(148, 163, 184, 0.1)' },
      audio_start: { color: '#EC4899', icon: 'volume-up', bg: 'rgba(236, 72, 153, 0.1)' },
      audio_done: { color: '#14B8A6', icon: 'graphic-eq', bg: 'rgba(20, 184, 166, 0.1)' },
      audio_failed: { color: '#94A3B8', icon: 'volume-off', bg: 'rgba(148, 163, 184, 0.1)' },
      card_complete: { color: '#10B981', icon: 'done-all', bg: 'rgba(16, 185, 129, 0.15)' },
    };
    return styles[activityType] || { color: '#94A3B8', icon: 'info', bg: 'rgba(148, 163, 184, 0.1)' };
  };

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={styles.container}
    >
      <TouchableOpacity
        style={styles.indicator}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={styles.mainRow}>
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="check-circle" size={20} color="#10B981" />
          )}
          <Text style={styles.mainText}>
            {isProcessing
              ? `Processing cards...`
              : `Queue complete ✓`}
          </Text>
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={20}
            color="#fff"
          />
        </View>

        {expanded && (
          <View style={styles.details}>
            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statBadge, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Text style={[styles.statText, { color: '#3B82F6' }]}>
                  ⏳ {pending}
                </Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                <Text style={[styles.statText, { color: '#10B981' }]}>
                  ✓ {completed}
                </Text>
              </View>
              {failed > 0 && (
                <View style={[styles.statBadge, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Text style={[styles.statText, { color: '#EF4444' }]}>
                    ✗ {failed}
                  </Text>
                </View>
              )}
            </View>

            {/* Activity Feed */}
            {activities.length > 0 && (
              <View style={styles.activityFeed}>
                <Text style={styles.feedTitle}>Live Activity Feed</Text>
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.activityScroll}
                  contentContainerStyle={styles.activityContent}
                  showsVerticalScrollIndicator={true}
                >
                  {activities.map((activity, index) => {
                    const style = getActivityStyle(activity.activityType);
                    return (
                      <View
                        key={activity.id}
                        style={[styles.activityItem, { backgroundColor: style.bg }]}
                      >
                        <MaterialIcons
                          name={style.icon}
                          size={14}
                          color={style.color}
                          style={styles.activityIcon}
                        />
                        <Text style={[styles.activityText, { color: style.color }]}>
                          {activity.message}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text style={styles.infoText}>
              {isProcessing
                ? 'Processing with 6-second delays to respect API rate limits'
                : 'All cards processed successfully'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  indicator: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mainText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  details: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
  },
  activityFeed: {
    marginTop: 8,
    marginBottom: 12,
  },
  feedTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityScroll: {
    maxHeight: 200,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  activityContent: {
    padding: 8,
    gap: 6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'currentColor',
  },
  activityIcon: {
    marginRight: 8,
  },
  activityText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  infoText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});





