// // import { Redirect } from 'expo-router';

// // export default function Index() {
// //   return <Redirect href="/(employee)" />;
// // }

// import { useEffect } from 'react';
// import { router } from 'expo-router';
// import { supabase } from '../lib/supabase';

// export default function Index() {
//   useEffect(() => {
//     checkRole();
//   }, []);

//   async function checkRole() {
//     const testEmail = 'sneha@karyasiddhi.com'; // Change this

//     const { data, error } = await supabase
//       .from('users')
//       .select('role')
//       .eq('email', testEmail)
//       .single();

//     if (error) {
//       console.log(error);
//       return;
//     }

//     if (data.role === 'admin') {
//       router.replace('/(admin)');
//     } else {
//       router.replace('/(employee)');
//     }
//   }

//   return null;
// }
import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function Index() {
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // No user logged in → Show Login Choice
      if (!session || !session.user) {
        router.replace("/(auth)/LoginChoice");
        return;
      }

      const email = session.user.email;

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("email", email)
        .single();

      if (error || !data) {
        console.log(error);
        router.replace("/(auth)/LoginChoice");
        return;
      }

      if (data.role === "admin") {
        router.replace("/(admin)");
      } else {
        router.replace("/(employee)");
      }
    } catch (err) {
      console.log(err);
      router.replace("/(auth)/LoginChoice");
    }
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1A214F" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
