
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Update the ImportCSV component to accept and use a style prop
export default function ImportCSV({ deckId, style }) {
  // Your existing implementation

  return (
    <TouchableOpacity 
      style={style || {}} // Use provided style or empty object as fallback
      onPress={handleImport}
    >
      <MaterialIcons name="upload-file" size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={{ color: '#fff', fontWeight: '600' }}>Import Words</Text>
    </TouchableOpacity>
  );
}

