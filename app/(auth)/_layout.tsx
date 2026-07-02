import { Stack } from "expo-router";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  // useEffect(() => {
  //   async function register() {
  //     const settings = await Notifications.getPermissionsAsync();

  //     if (settings.status !== "granted") {
  //       await Notifications.requestPermissionsAsync();
  //     }
  //   }

  //   register();
  // }, []);

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
