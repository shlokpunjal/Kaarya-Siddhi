import { Platform } from "react-native";

/**
 * Was duplicated identically in admin-connection-review.tsx and
 * admin-request-review.tsx.
 */
export const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  android: { elevation: 4 },
});