import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Redirect, Slot } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { mockAuth } from './mockAuth';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { isLoggedIn, role } = mockAuth;

  if (!isLoggedIn) {
    return <Redirect href="/clientLogin" />;
  }

  if (role === 'employee') {
    return <Redirect href="/(employee)" />;
  }

  if (role === 'admin') {
    return <Redirect href="/(admin)" />;
  }

  return <Slot />;
}