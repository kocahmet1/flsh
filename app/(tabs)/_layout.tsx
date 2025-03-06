import { Tabs } from 'expo-router';
import TabBarIcon from '../../src/components/TabBarIcon';
import { View, Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#6366F1',
      tabBarStyle: {
        backgroundColor: '#0F172A',
        borderTopColor: '#1E293B',
        paddingTop: 5,
        height: 60,
      },
      tabBarLabelStyle: {
        marginBottom: 5,
        fontSize: 12,
        color: '#94A3B8',
      },
      headerStyle: {
        backgroundColor: '#0F172A',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
      },
      headerTintColor: '#F8FAFC',
      headerTitleStyle: {
        color: '#F8FAFC',
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Decks',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="cards" color="#6366F1" size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: 'bold', color: '#F8FAFC' }}>My Decks</Text>
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
              <TabBarIcon name="view-grid" color="#6366F1" size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600', color: '#F8FAFC' }}>Deck Gallery</Text>
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
              <TabBarIcon name="plus-circle" color="#6366F1" size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600', color: '#F8FAFC' }}>Create New Deck</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <TabBarIcon name="plus-circle-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
