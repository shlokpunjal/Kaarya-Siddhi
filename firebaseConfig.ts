// import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp } from "firebase/app";
const firebaseConfig = {
  apiKey: "AIzaSyA2QJKkApOwsTmjupn-7Jddn8ZJhtx-Ru0",
  authDomain: "otp-testing-67688.firebaseapp.com",
  projectId: "otp-testing-67688",
  storageBucket: "otp-testing-67688.firebasestorage.app",
  messagingSenderId: "987353941791",
  appId: "1:987353941791:web:7e48297568b0da2235d22a",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});