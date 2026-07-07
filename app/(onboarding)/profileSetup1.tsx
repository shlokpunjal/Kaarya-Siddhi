// import { useState } from "react";
// import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { router, useLocalSearchParams } from "expo-router";
// import * as ImagePicker from "expo-image-picker";
// import { Ionicons } from "@expo/vector-icons";
// import ProgressDots from "../../components/progressDots";
// import { lightTheme, typography } from "../../theme/theme";
// import { API_BASE_URL } from "../../constants/api";
// import { useAuth } from "../../hooks/useAuth";

// const { colors } = lightTheme;
// const ERROR = "#D32F2F";

// export default function ProfileSetup1() {
//   const { role, name } = useLocalSearchParams<{ role: string; name?: string }>();
//   const { token } = useAuth();

//   const [photo, setPhoto] = useState<string | null>(null);
//   const [designation, setDesignation] = useState("");
//   const [designationError, setDesignationError] = useState("");
//   const [submitting, setSubmitting] = useState(false);

//   const pickImage = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ['images'],
//       quality: 0.7,
//     });
//     if (!result.canceled) setPhoto(result.assets[0].uri);
//   };

//   const validate = () => {
//     if (!designation.trim()) {
//       setDesignationError("Please enter your designation");
//       return false;
//     }
//     setDesignationError("");
//     return true;
//   };

//   const handleDone = async () => {
//     if (!validate()) return;

//     try {
//       setSubmitting(true);
//       await fetch(`${API_BASE_URL}/profile`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ designation, photo }),
//       });

//       router.push({ pathname: "/(onboarding)/profileSetup2", params: { role } });
//     } catch (error) {
//       console.log(error);
//       setDesignationError("Something went wrong. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.safe}>
//       <View style={styles.header}>
//         <Text style={[styles.headerText, typography.heading]}>Profile Setup</Text>
//       </View>

//       <View style={[styles.container ]}>
//         <Text style={[styles.greeting, typography.heading]}>
//           Hey {name ? name : "there"}!
//         </Text>

//         <Text style={[styles.title, typography.body]}>Let's set up your profile</Text>

//         <View style={styles.card}>
//           <TouchableOpacity style={styles.photoCircle} onPress={pickImage}>
//             {photo ? (
//               <Image source={{ uri: photo }} style={styles.photoImg} />
//             ) : (
//               <Ionicons name="camera" size={50} color={colors.text.secondary} />
//             )}
//           </TouchableOpacity>
//           <Text style={[styles.uploadLabel, typography.heading3]}>Upload Profile Picture</Text>

//           <TextInput
//             style={[
//               styles.input,
//               typography.body,
//               designationError ? styles.inputError : null,
//             ]}
//             placeholder="Designation*"
//             placeholderTextColor={colors.text.secondary}
//             value={designation}
//             onChangeText={(text) => {
//               setDesignation(text);
//               if (designationError) setDesignationError("");
//             }}
//           />
//           {designationError ? (
//             <Text style={[styles.errorText, typography.label]}>{designationError}</Text>
//           ) : null}

//           <TouchableOpacity style={styles.doneBtn} onPress={handleDone} disabled={submitting}>
//             {submitting ? (
//               <ActivityIndicator color="#fff" />
//             ) : (
//               <Text style={[styles.doneBtnText, typography.subheading]}>Done!</Text>
//             )}
//           </TouchableOpacity>
//         </View>

//         <View style={styles.dotsWrap}>
//           <ProgressDots total={3} current={1} />
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safe: { flex: 1, backgroundColor: colors.base.background },
//   header: { backgroundColor: colors.brand.primary, paddingVertical: 18, paddingHorizontal: 20,height:72},
//   headerText: { color: "#fff" },
//   container: { flex: 1, paddingHorizontal: 30, paddingTop: 40,marginTop:50 },
//   greeting: { textAlign: "center", color: colors.brand.primary, marginBottom: 4},
//   title: { textAlign: "center", color: colors.text.secondary, marginBottom: 20 },
//   card: {
//     backgroundColor: colors.base.surfaceL1,
//     borderRadius: 12,
//     padding: 24,
//     alignItems: "center",
//     borderWidth: 1,
//     borderColor: colors.base.border,
//   },
//   photoCircle: {
//     width: 84,
//     height: 84,
//     borderRadius: 42,
//     backgroundColor: colors.base.surfaceL2,
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 10,
//     overflow: "hidden",
//   },
//   photoImg: { width: 84, height: 84 },
//   uploadLabel: { color: colors.text.primary, marginBottom: 16 },
//   input: {
//     width: "100%",
//     backgroundColor: colors.base.surfaceL2,
//     borderRadius: 8,
//     paddingHorizontal: 14,
//     paddingVertical: 14,
//     borderWidth: 1,
//     borderColor: "transparent",
//     color: colors.text.primary,
//   },
//   inputError: {
//     borderColor: ERROR,
//     backgroundColor: "#FDECEC",
//   },
//   errorText: {
//     color: ERROR,
//     alignSelf: "flex-start",
//     marginTop: 6,
//     marginLeft: 4,
//     marginBottom: 6,
//   },
//   doneBtn: {
//     backgroundColor: colors.brand.primary,
//     borderRadius: 16,
//     paddingVertical: 16,
//     width: "100%",
//     alignItems: "center",
//     marginTop: 10,
//   },
//   doneBtnText: { color: "#fff" },
//   dotsWrap: { marginTop: "auto", marginBottom: 40, alignItems: "center" },
// });


import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProgressDots from "../../components/progressDots";
import { lightTheme, typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

const { colors } = lightTheme;
const ERROR = "#D32F2F";

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export default function ProfileSetup1() {
  const { role, name } = useLocalSearchParams<{ role: string; name?: string }>();

  const [photo, setPhoto] = useState<string | null>(null);
  const [designation, setDesignation] = useState("");
  const [designationError, setDesignationError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const validate = () => {
    if (!designation.trim()) {
      setDesignationError("Please enter your designation");
      return false;
    }
    setDesignationError("");
    return true;
  };

  const uploadPhotoToCloudinary = async (localUri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      type: 'image/jpeg',
      name: `avatar_${Date.now()}.jpg`,
    } as any);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'profile_pics');

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );
    const data = await res.json();
    if (!data.secure_url) throw new Error(data.error?.message || 'Photo upload failed');
    return data.secure_url;
  };

  const handleDone = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);

      const savedEmail = await AsyncStorage.getItem('userEmail');
      if (!savedEmail) throw new Error('No logged-in user found');

      let photoUrl: string | null = null;
      if (photo) {
        photoUrl = await uploadPhotoToCloudinary(photo);
      }

      const { error } = await supabase
        .from('users')
        .update({
          designation: designation.trim(),
          ...(photoUrl ? { profile_pic_url: photoUrl } : {}),
        })
        .eq('email', savedEmail);

      if (error) throw error;

      router.push({ pathname: "/(onboarding)/profileSetup2", params: { role, name } });
    } catch (error: any) {
      console.log(error);
      setDesignationError(error.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={[styles.headerText, typography.heading]}>Profile Setup</Text>
      </View>

      <View style={[styles.container ]}>
        <Text style={[styles.greeting, typography.heading]}>
          Hey {name ? name : "there"}!
        </Text>

        <Text style={[styles.title, typography.body]}>Let's set up your profile</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.photoCircle} onPress={pickImage}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoImg} />
            ) : (
              <Ionicons name="camera" size={50} color={colors.text.secondary} />
            )}
          </TouchableOpacity>
          <Text style={[styles.uploadLabel, typography.heading3]}>Upload Profile Picture</Text>

          <TextInput
            style={[
              styles.input,
              typography.body,
              designationError ? styles.inputError : null,
            ]}
            placeholder="Designation*"
            placeholderTextColor={colors.text.secondary}
            value={designation}
            onChangeText={(text) => {
              setDesignation(text);
              if (designationError) setDesignationError("");
            }}
          />
          {designationError ? (
            <Text style={[styles.errorText, typography.label]}>{designationError}</Text>
          ) : null}

          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.doneBtnText, typography.subheading]}>Done!</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dotsWrap}>
          <ProgressDots total={3} current={1} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base.background },
  header: { backgroundColor: colors.brand.primary, paddingVertical: 18, paddingHorizontal: 20,height:72},
  headerText: { color: "#fff" },
  container: { flex: 1, paddingHorizontal: 30, paddingTop: 40,marginTop:50 },
  greeting: { textAlign: "center", color: colors.brand.primary, marginBottom: 4},
  title: { textAlign: "center", color: colors.text.secondary, marginBottom: 20 },
  card: {
    backgroundColor: colors.base.surfaceL1,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.base.border,
  },
  photoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.base.surfaceL2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  photoImg: { width: 84, height: 84 },
  uploadLabel: { color: colors.text.primary, marginBottom: 16 },
  input: {
    width: "100%",
    backgroundColor: colors.base.surfaceL2,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "transparent",
    color: colors.text.primary,
  },
  inputError: {
    borderColor: ERROR,
    backgroundColor: "#FDECEC",
  },
  errorText: {
    color: ERROR,
    alignSelf: "flex-start",
    marginTop: 6,
    marginLeft: 4,
    marginBottom: 6,
  },
  doneBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 16,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  doneBtnText: { color: "#fff" },
  dotsWrap: { marginTop: "auto", marginBottom: 40, alignItems: "center" },
});