import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { User, Video, Settings } from 'lucide-react-native';
import { colors } from '../theme';

// Screens
import { AccountsScreen } from '../screens/AccountsScreen';
import { VideosScreen } from '../screens/VideosScreen';
import { VideoEditorScreen } from '../screens/VideoEditorScreen';
import { DistributionScreen } from '../screens/DistributionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.light.textSecondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.light.divider,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Videos"
        component={VideosScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Video size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="VideoEditor" component={VideoEditorScreen} />
      <Stack.Screen name="Distribution" component={DistributionScreen} />
    </Stack.Navigator>
  );
}
