import { Tabs, router } from 'expo-router';
import { Image } from 'react-native';
import { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { moderateScale } from '../../utils/responsive';
const icons = {
  home: {
    outline: require('../../assets/icons/home-outline.png'),
    filled: require('../../assets/icons/home-filled.png'),
  },
  tasks: {
    outline: require('../../assets/icons/tasks-outline.png'),
    filled: require('../../assets/icons/tasks-filled.png'),
  },
  report: {
    outline: require('../../assets/icons/report-outline.png'),
    filled: require('../../assets/icons/report-filled.png'),
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
      style={{ width: moderateScale(28), height: moderateScale(28), opacity: focused ? 1 : 0.6 }}
      resizeMode="contain"
    />
  );
}

export default function AdminTabsLayout() {
  const { colors } = useTheme();
  const { userRole, isLoading } = useAuth();

  // Defense-in-depth only: every admin-only action is already re-verified
  // server-side against the caller's real (JWT-verified) role, so this
  // can't be bypassed to gain access. This just avoids showing an
  // employee session the admin tab chrome (e.g. after a stale deep link)
  // instead of redirecting them somewhere that actually works.
  useEffect(() => {
    if (!isLoading && userRole && userRole !== 'admin') {
      router.replace(userRole === 'employee' ? '/(employee)' : '/(auth)/LoginChoice');
    }
  }, [isLoading, userRole]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.accent,
        tabBarInactiveTintColor: '#A9B2C8',
        tabBarStyle: {
          backgroundColor: colors.brand.primary,
          height: moderateScale(90),
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
        name="report"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused }) => (
            <TabIcon source={focused ? icons.report.filled : icons.report.outline} focused={focused} />
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

      {/* Notification screens — reachable via router.push, hidden from the tab bar 
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="notification-detail" options={{ href: null }} />*/}
    </Tabs>
  );
}
