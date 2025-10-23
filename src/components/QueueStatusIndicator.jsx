import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import queueManager from '../utils/cardProcessingQueue';

/**
 * A floating indicator that shows the background processing queue status
 */
export default function QueueStatusIndicator() {
  const [status, setStatus] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to queue updates
    const handleStatusUpdate = (newStatus) => {
      setStatus(newStatus);
    };

    queueManager.addListener(handleStatusUpdate);

    // Cleanup
    return () => {
      queueManager.removeListener(handleStatusUpdate);
    };
  }, []);

  // Don't show if queue is empty and not processing
  if (!status || (status.total === 0 && !status.isProcessing)) {
    return null;
  }

  const { total, pending, processing, failed, isProcessing } = status;
  const completed = total - pending - processing - failed;

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
              ? `Processing cards... ${completed}/${total}`
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
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={16} color="#F59E0B" />
              <Text style={styles.detailText}>Pending: {pending}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="autorenew" size={16} color="#3B82F6" />
              <Text style={styles.detailText}>Processing: {processing}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="check" size={16} color="#10B981" />
              <Text style={styles.detailText}>Completed: {completed}</Text>
            </View>
            {failed > 0 && (
              <View style={styles.detailRow}>
                <MaterialIcons name="error" size={16} color="#EF4444" />
                <Text style={styles.detailText}>Failed: {failed}</Text>
              </View>
            )}
            <Text style={styles.infoText}>
              Processing with 6-second delays to respect API rate limits
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
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  indicator: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  details: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  infoText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
});



