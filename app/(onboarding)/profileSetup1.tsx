import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ProgressDots from "../../components/progressDots";

export default function ProfileSetup1() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const handleDone = () => {
    // TODO: save name, designation, photo to backend / store
    router.push({ pathname: "/(onboarding)/profileSetup2", params: { role } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Profile Setup</Text>
      </View>

      <Text style={styles.title}>Let's set up your profile</Text>

      <View style={styles.card}>
        <TouchableOpacity style={styles.photoCircle} onPress={pickImage}>
          {photo ? <Image source={{ uri: photo }} style={styles.photoImg} /> : <Text style={{ fontSize: 24 }}>📷</Text>}
        </TouchableOpacity>
        <Text style={styles.uploadLabel}>Upload Profile Picture</Text>

        <TextInput style={styles.input} placeholder="Name*" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Designation*" value={designation} onChangeText={setDesignation} />

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done!</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push({ pathname: "/(onboarding)/profileSetup2", params: { role } })}>
        <Text style={styles.skip}>Skip</Text>
      </TouchableOpacity>

      <ProgressDots total={4} current={1} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 20 },
  header: { backgroundColor: "#0F1F3D", padding: 16, borderRadius: 6, marginBottom: 20 },
  headerText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  title: { textAlign: "center", color: "#666", marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 20, alignItems: "center" },
  photoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEE", justifyContent: "center", alignItems: "center", marginBottom: 8, overflow: "hidden" },
  photoImg: { width: 80, height: 80 },
  uploadLabel: { fontWeight: "600", marginBottom: 16 },
  input: { width: "100%", backgroundColor: "#F0F0F0", borderRadius: 6, padding: 12, marginBottom: 12 },
  doneBtn: { backgroundColor: "#0F1F3D", borderRadius: 6, paddingVertical: 12, width: "100%", alignItems: "center", marginTop: 8 },
  doneBtnText: { color: "#fff", fontWeight: "700" },
  skip: { alignSelf: "flex-end", marginTop: 12, textDecorationLine: "underline", color: "#333" },
});