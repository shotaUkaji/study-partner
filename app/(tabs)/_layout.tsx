import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#10121a',
          borderTopColor: '#1e2030',
        },
        tabBarActiveTintColor: '#c9a84c',
        tabBarInactiveTintColor: '#5a6080',
        headerStyle: { backgroundColor: '#0d0e14' },
        headerTintColor: '#e8e0d0',
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
  const { Text } = require('react-native');
  return <Text style={{ color, fontSize: 18 }}>{label}</Text>;
}
