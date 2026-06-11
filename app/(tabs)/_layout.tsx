import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabBarIcon from '../../src/components/TabBarIcon';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8678FF',
        tabBarInactiveTintColor: '#8B93B7',
        tabBarStyle: {
          backgroundColor: '#10172B',
          borderTopColor: '#1E2748',
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          height: 64 + Math.max(insets.bottom, 10),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
        headerStyle: {
          backgroundColor: '#10172B',
        },
        headerTintColor: '#F6F8FF',
        headerTitleStyle: {
          color: '#F6F8FF',
        },
        sceneStyle: {
          backgroundColor: '#10172B',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Sets',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="cards-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-deck"
        options={{
          title: 'Create',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="plus-circle-outline" color="#8678FF" size={22} />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#F6F8FF',
                }}
              >
                Create Deck
              </Text>
            </View>
          ),
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="plus-circle-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="cog-outline" color="#8678FF" size={22} />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#F6F8FF',
                }}
              >
                Settings
              </Text>
            </View>
          ),
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="cog-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
