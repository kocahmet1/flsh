import { Tabs } from 'expo-router';
import TabBarIcon from '../../src/components/TabBarIcon';
import { View, Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#007AFF',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Decks',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="cards" color="#007AFF" size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: 'bold' }}>My Decks</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <TabBarIcon name="cards-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="deck-gallery"
        options={{
          title: 'Deck Gallery',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="view-grid" color="#007AFF" size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600' }}>Deck Gallery</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <TabBarIcon name="view-grid-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-deck"
        options={{
          title: 'Add Deck',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="plus-circle" color="#007AFF" size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600' }}>Create New Deck</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <TabBarIcon name="plus-circle-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
