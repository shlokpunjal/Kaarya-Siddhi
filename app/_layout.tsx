import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, Image, Text, Animated, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen'
import { supabase } from '../lib/supabase'
import { ThemeProvider } from '../context/ThemeContext';
import { typography } from '../theme/theme';
import { AuthProvider } from "../context/AuthContext";

SplashScreen.preventAutoHideAsync();

const BRAND_PRIMARY = '#1A2744';
const BRAND_ACCENT = '#E8870A';
const BRAND_SHADOW = '#815727';
const TEXT_PRIMARY = '#F0EDE6';
const TEXT_SECONDARY = '#8B95A1';
const LOGO_SIZE = 114;

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  const [showSplash, setShowSplash] = useState(true)
  const splashOpacity = useRef(new Animated.Value(1)).current

  // useEffect(() => {
  //   async function test() {
  //     console.log('🔄 Testing Supabase...')

  //     const { data, error } = await supabase.from('users').select('*')

  //     // console.log('DATA:', JSON.stringify(data))
  //     console.log('ERROR:', JSON.stringify(error))
  //   }
  //   test()
  // }, [])

  useEffect(() => {
    if (!fontsLoaded) return

    async function prepare() {
      await SplashScreen.hideAsync()

      const holdTimer = setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }).start(() => setShowSplash(false))
      }, 1500)

      return () => clearTimeout(holdTimer)
    }

    prepare()
  }, [fontsLoaded])

  if (!fontsLoaded) {
    // Invisible in practice — native splash is still covering this.
    return <View style={{ flex: 1, backgroundColor: BRAND_PRIMARY }} />;
  }

  return (
    <AuthProvider>

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

        {showSplash && (
          <Animated.View pointerEvents="none" style={[styles.splash, { opacity: splashOpacity }]}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={[typography.heading, styles.title]}>Kaarya Siddhi</Text>
            <Text style={[typography.heading, styles.subTitle]}>कार्य सिद्धि</Text>
            <View style={styles.footer}>
              <Text style={[typography.label, styles.credits]}>Developed By</Text>
              <Text style={[typography.heading3, styles.subCredits]}>DRM SUR, Central Railways</Text>
            </View>
          </Animated.View>
        )}
      </ThemeProvider>
    </AuthProvider>

  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: BRAND_ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: TEXT_PRIMARY, textShadowColor: BRAND_SHADOW,
    textShadowOffset: { width: 1, height: 1, },
    textShadowRadius: 0.1,
  },
  subTitle: {
    color: BRAND_ACCENT, textShadowColor: BRAND_SHADOW,
    textShadowOffset: { width: 1, height: 1, },
    textShadowRadius: 0.01,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  credits: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    textAlign: 'center',
  },
  subCredits: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    textAlign: 'center',
  },
});