// Requires: npx expo install @react-native-community/netinfo
// (Most Expo apps already have this — check package.json first.)
 
import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
 
export function useNetworkStatus() {
  // Assume connected until the first check resolves, to avoid a flash
  // of the offline screen on cold start.
  const [isConnected, setIsConnected] = useState(true);
 
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while NetInfo is still checking —
      // fall back to isConnected in that case.
      const reachable =
        state.isInternetReachable === null
          ? state.isConnected
          : state.isInternetReachable;
      setIsConnected(Boolean(reachable));
    });
 
    return () => unsubscribe();
  }, []);
 
  // Active probe for a manual "Retry" button — NetInfo.fetch() forces a
  // fresh reachability check instead of waiting on the passive listener,
  // which matters because a device can show "connected to Wi-Fi" while
  // that Wi-Fi has no actual internet.
  const checkNow = async () => {
    const state = await NetInfo.fetch();
    const reachable =
      state.isInternetReachable === null
        ? state.isConnected
        : state.isInternetReachable;
    const connected = Boolean(reachable);
    setIsConnected(connected);
    return connected;
  };
 
  return { isConnected, checkNow };
}