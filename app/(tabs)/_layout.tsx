import { Tabs } from 'expo-router';
import TabBarIcon from '../../src/components/TabBarIcon';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useApp();
  const c = theme.colors;
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: c.tabBarActive,
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        backgroundColor: c.tabBarBackground,
        borderTopColor: c.tabBarBorder,
        paddingTop: 5,
        // Add safe-area aware bottom padding instead of fixed height so
        // the tab bar stays above the Android system navigation bar.
        paddingBottom: Math.max(insets.bottom, 8),
      },
      tabBarLabelStyle: {
        marginBottom: 5,
        fontSize: 12,
        color: c.tabBarLabel,
      },
      headerStyle: {
        backgroundColor: c.headerBackground,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
      },
      headerTintColor: c.headerText,
      headerTitleStyle: {
        color: c.headerText,
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Vocab Sets',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="cards" color={c.tabBarActive} size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: 'bold', color: c.headerText }}>My Vocab Sets</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <TabBarIcon name="cards-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="deck-gallery"
        options={{
          title: 'Set Gallery',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="view-grid" color={c.tabBarActive} size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600', color: c.headerText }}>Set Gallery</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <TabBarIcon name="view-grid-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-deck"
        options={{
          title: 'Create New Set',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="plus-circle" color={c.tabBarActive} size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600', color: c.headerText }}>Create New Set</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <TabBarIcon name="plus-circle-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TabBarIcon name="cog" color={c.tabBarActive} size={24} />
              <Text style={{ marginLeft: 8, fontSize: 17, fontWeight: '600', color: c.headerText }}>Settings</Text>
            </View>
          ),
          tabBarIcon: ({ color }) => <TabBarIcon name="cog-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
