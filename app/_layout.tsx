import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    async function test() {
      console.log('🔄 Testing Supabase...')

      const { data, error } = await supabase.from('users').select('*')

      console.log('DATA:', JSON.stringify(data))
      console.log('ERROR:', JSON.stringify(error))
    }
    test()
  }, [])

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }



  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(employee)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(task)/task-detail" />
        <Stack.Screen name="(task)/newtask" />
        <Stack.Screen name="(task)/extend-deadline" />
        <Stack.Screen name="reports/genExcel" />
        <Stack.Screen name="reports/genPdf" />
      </Stack>
    </ThemeProvider>
  );
}