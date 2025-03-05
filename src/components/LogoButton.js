import React from 'react';
import { StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';

export default function LogoButton({ destination = '/(tabs)', size = 50, style = {} }) {
  const router = useRouter();
  const animatedScale = new Animated.Value(1);

  const handlePress = () => {
    // Animation when pressed
    Animated.sequence([
      Animated.timing(animatedScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    // Navigate
    router.push(destination);
  };

  return (
    <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
      <TouchableOpacity 
        style={[styles.button, { width: size, height: size }, style]} 
        onPress={handlePress}
      >
        <Image 
          source={require('../../assets/images/1630603219122.jpeg')} 
          style={styles.logo} 
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 50,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  logo: {
    width: '100%',
    height: '100%',
  }
});