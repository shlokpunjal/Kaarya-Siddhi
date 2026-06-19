import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#E8870A", // Active tab icon color (your orange)
        tabBarInactiveTintColor: "#A0AEC0", // Faded text/icon color
        tabBarStyle: {
          backgroundColor: "#1A2744", // Deep theme color for the bar
          borderTopWidth: 0, // Removes top separator line
          height: 60,
          paddingBottom: 8,
        },
        headerShown: false, // Hides default top white headers
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-sharp" size={size} color={color} />
          ),
        }}
      />

        
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-sharp" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
