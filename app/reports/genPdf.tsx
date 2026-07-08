import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import * as SecureStore from "expo-secure-store";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const API_BASE = "https://kaarya-siddhi.onrender.com";

export default function GenPdf() {
  const { colors } = useTheme();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  // const [reportFileUri, setReportFileUri] = useState<string | null>(null);

  // const handleGenerate = () => {
  //   setLoading(true);
  //   const params = new URLSearchParams();
  //   if (startDate) params.append('start_date', startDate);
  //   if (endDate) params.append('end_date', endDate);
  //   const url = `${API_BASE}/reports/tasks/pdf?${params.toString()}`;
  //   setGeneratedUrl(url);
  //   setLoading(false);
  // };

  // const handleOpen = () => {
  //   if (generatedUrl) Linking.openURL(generatedUrl);
  // };
  const [reportFileUri, setReportFileUri] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("token");
      if (!token) {
        Alert.alert("Session expired", "Please log in again.");
        return;
      }

      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const url = `${API_BASE}/reports/tasks/pdf?${params.toString()}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        Alert.alert("Error", data.detail || "Could not generate report.");
        return;
      }

      const blob = await response.blob();
      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () =>
          resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileName = `task_report_${startDate}_to_${endDate}.pdf`;
      const file = new File(Paths.cache, fileName);
      await file.write(base64Data, { encoding: "base64" });

      setReportFileUri(file.uri);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Something went wrong while generating the report.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    if (!reportFileUri) return;
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(reportFileUri, {
        mimeType: "application/pdf",
        dialogTitle: "Task Report",
      });
    } else {
      Alert.alert("Report saved", `Saved to: ${reportFileUri}`);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.base.background }]}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text
          style={[
            typography.heading,
            { color: colors.text.primary, marginBottom: 4 },
          ]}
        >
          Generate PDF Report
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.text.secondary, marginBottom: 22 },
          ]}
        >
          Select a date range to export tasks as PDF
        </Text>

        <Text
          style={[
            typography.heading3,
            { color: colors.text.secondary, marginBottom: 10 },
          ]}
        >
          Date range
        </Text>
        <View style={styles.dateRow}>
          <View
            style={[
              styles.textInput,
              {
                backgroundColor: colors.base.surfaceL1,
                borderColor: colors.base.border,
              },
            ]}
          >
            <Text
              style={[
                typography.label,
                { color: colors.text.secondary, marginBottom: 2 },
              ]}
            >
              Start date
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: startDate
                    ? colors.text.primary
                    : colors.text.secondary,
                },
              ]}
            >
              {startDate || "YYYY-MM-DD"}
            </Text>
          </View>
          <View
            style={[
              styles.textInput,
              {
                backgroundColor: colors.base.surfaceL1,
                borderColor: colors.base.border,
              },
            ]}
          >
            <Text
              style={[
                typography.label,
                { color: colors.text.secondary, marginBottom: 2 },
              ]}
            >
              End date
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: endDate ? colors.text.primary : colors.text.secondary,
                },
              ]}
            >
              {endDate || "YYYY-MM-DD"}
            </Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, { backgroundColor: colors.base.surfaceL2 }]}
            onPress={() => setStartDate("2026-06-18")}
          >
            <Text style={[typography.label, { color: colors.text.primary }]}>
              Jun 18
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, { backgroundColor: colors.base.surfaceL2 }]}
            onPress={() => setEndDate("2026-06-27")}
          >
            <Text style={[typography.label, { color: colors.text.primary }]}>
              Jun 27
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, { backgroundColor: colors.base.surfaceL2 }]}
            onPress={() => {
              setStartDate("");
              setEndDate("");
              setGeneratedUrl(null);
            }}
          >
            <Text style={[typography.label, { color: colors.text.primary }]}>
              Clear
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[
            styles.generateButton,
            { backgroundColor: colors.brand.accent },
          ]}
          onPress={handleGenerate}
        >
          <Text style={[typography.subheading, { color: "#FFFFFF" }]}>
            {loading ? "Generating..." : "Generate Report"}
          </Text>
        </Pressable>

        {generatedUrl && (
          <View
            style={[
              styles.resultBox,
              {
                backgroundColor: colors.base.surfaceL1,
                borderColor: colors.base.border,
              },
            ]}
          >
            <Text
              style={[
                typography.body,
                { color: colors.text.primary, marginBottom: 12 },
              ]}
            >
              Report ready.
            </Text>
            <Pressable
              style={[
                styles.actionButton,
                { backgroundColor: colors.brand.primary },
              ]}
              onPress={handleOpen}
            >
              <Text style={[typography.heading3, { color: "#FFFFFF" }]}>
                View / Download
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  textInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12 },
  chip: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20 },
  generateButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 26,
  },
  resultBox: { marginTop: 20, borderRadius: 14, borderWidth: 1, padding: 16 },
  actionButton: { borderRadius: 12, paddingVertical: 13, alignItems: "center" },
});
