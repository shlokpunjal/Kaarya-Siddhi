import { Stack } from "expo-router";
import { Lora_400Regular, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { useFonts } from "expo-font";

export default function Layout() {
  const [fontsLoaded] = useFonts({
        Poppins_400Regular,
        Poppins_500Medium,
        Poppins_600SemiBold,
    })

    if (!fontsLoaded) {
        return null;
    }
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}