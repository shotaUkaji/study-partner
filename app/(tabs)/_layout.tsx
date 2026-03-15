import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#f5f0e8',
          borderTopColor: '#d8d0c0',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#c9a84c',
        tabBarInactiveTintColor: '#a09580',
        headerStyle: { backgroundColor: '#f5f0e8' },
        headerTintColor: '#1a1612',
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '調べごと',
          tabBarIcon: ({ color }) => <TabIcon label="◈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <TabIcon label="⚙" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{label}</Text>;
}
