import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { useCallback, useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase'
import { ThemeProvider } from '../context/ThemeContext';
import AppSplash from '../components/splashScreen/AppSplash';

// Keep the native splash (navy bg + logo, configured in app.json) on
// screen until we manually hide it below — this is what stops the
// "flash to a different screen" gap between native splash and JS.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  // AppSplash below is pixel-matched to the native splash. The moment
  // it has painted, it's safe to hide the native one underneath — the
  // user only ever sees one continuous branded screen.
  const onAppSplashLayout = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

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
      <View onLayout={onAppSplashLayout} style={{ flex: 1 }}>
        <AppSplash />
      </View>
    );
  }

  

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}