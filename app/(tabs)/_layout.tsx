import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
        headerShown:false,
        tabBarStyle: {
          backgroundColor: "#1f2d4d",
          height: 70,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: "absolute",
        },

        tabBarActiveTintColor: "#F59E0B",
        tabBarInactiveTintColor: "gray",
    }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({}) => (
            <Ionicons name="home" size={30} color="rgb(249, 180, 18)" />
          ),
        }}
      />

      <Tabs.Screen
        name="statistics"
        options={{
          title: "statistics",
          tabBarIcon: ({size }) => (
            <Ionicons name="bar-chart-outline" size={size} color="rgb(255, 187, 0)" />
          ),
        }}
      />

       <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ size }) => (
            <Ionicons name="calendar" size={size} color="rgb(255, 187, 0)" />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ size }) => (
            <Ionicons name="person" size={size} color="rgb(255, 187, 0)" />
          ),
        }}
      />
    </Tabs>
  );
}