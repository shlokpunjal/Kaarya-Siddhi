import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useColorScheme, Animated, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from '../theme/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'kaaryaSiddhi:themeMode';
const FADE_DURATION = 250;

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  theme: Theme;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  const resolvedIsDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const theme = resolvedIsDark ? darkTheme : lightTheme;

  // Overlay used to cross-fade between themes instead of snapping instantly.
  // It's painted with whatever the *previous* background color was, then
  // faded to opacity 0 to reveal the new theme underneath.
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayColor = useRef(theme.colors.base.background);
  const isFirstRun = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    overlayOpacity.setValue(1);
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start();
  }, [resolvedIsDark]);

  // Runs after the overlay above has been painted with the OLD color for
  // this render, then stashes the new color for the *next* toggle.
  useEffect(() => {
    overlayColor.current = theme.colors.base.background;
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ mode, setMode, theme }}>
      <View style={{ flex: 1 }}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: overlayColor.current, opacity: overlayOpacity },
          ]}
        />
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return ctx.theme;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used inside a ThemeProvider');
  }
  return { mode: ctx.mode, setMode: ctx.setMode };
}