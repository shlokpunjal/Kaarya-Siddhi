import { lightTheme } from './theme';

// TEMPORARY: always returns light theme.
// Replace with real context/provider when dark mode support is added.
export const useTheme = () => lightTheme;