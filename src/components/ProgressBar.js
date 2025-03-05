import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const ProgressBar = ({ progress, width = '100%' }) => {
  return (
    <View style={[styles.container, { width }]}>
      <Animated.View 
        style={[
          styles.bar, 
          { 
            width: `${progress}%`,
            backgroundColor: progress < 50 ? '#FF9800' : '#4CAF50'
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 5,
  },
});

export default ProgressBar;