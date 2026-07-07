// app/(employee)/_layout.tsx
// Copy your existing layout and add the two hidden Tabs.Screen entries below.
// Only these lines are NEW — everything else stays exactly as you have it.

import { Tabs } from 'expo-router';
import { Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const icons = {
  home: {
    outline: require('../../assets/icons/home-outline.png'),
    filled: require('../../assets/icons/home-filled.png'),
  },
  tasks: {
    outline: require('../../assets/icons/tasks-outline.png'),
    filled: require('../../assets/icons/tasks-filled.png'),
  },
  calendar: {
    outline: require('../../assets/icons/calendar-outline.png'),
    filled: require('../../assets/icons/calendar-filled.png'),
  },
  profile: {
    outline: require('../../assets/icons/profile-outline.png'),
    filled: require('../../assets/icons/profile-filled.png'),
  },
};

function TabIcon({ source, focused }: { source: any; focused: boolean }) {
  return (
    <Image
      source={source}
      style={{ width: 28, height: 28, opacity: focused ? 1 : 0.6 }}
      resizeMode="contain"
    />
  );
}

export default function EmployeeTabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.accent,
        tabBarInactiveTintColor: '#A9B2C8',
        tabBarStyle: {
          backgroundColor: colors.brand.primary,
          height: 90,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          marginTop: 4,
          fontFamily: 'Poppins-Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={focused ? icons.home.filled : icons.home.outline} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={focused ? icons.tasks.filled : icons.tasks.outline} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={focused ? icons.calendar.filled : icons.calendar.outline} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={focused ? icons.profile.filled : icons.profile.outline} focused={focused} />
          ),
        }}
      />

     <Tabs.Screen name="notification/index" options={{ href: null }} />
      <Tabs.Screen name="notification/requests" options={{ href: null }} />
      <Tabs.Screen name="notification/request-detail" options={{ href: null }} />
    </Tabs>
  );
}
