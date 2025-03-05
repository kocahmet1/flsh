import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function LogoHeader({ title, showBackButton = false, showLogo = true, size = 'medium' }) {
  const router = useRouter();

  const goBack = () => {
    router.back();
  };

  const logoSize = {
    small: 30,
    medium: 40,
    large: 60
  };

  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        {showBackButton && (
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <View style={styles.titleContainer}>
          {showLogo && (
            <Image 
              source={require('../../assets/images/1630603219122.jpeg')} 
              style={[styles.logo, { width: logoSize[size], height: logoSize[size] }]} 
            />
          )}
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Placeholder view for centering */}
        {showBackButton ? <View style={styles.backButtonPlaceholder} /> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    marginBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    borderRadius: 50,
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});