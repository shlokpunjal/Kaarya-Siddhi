import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import ProgressDots from "../../components/progressDots";
import { lightTheme, typography } from "../../theme/theme";
import { PRIVACY_POLICY_TEXT } from "../../constants/privacyPolicyText";

const { colors } = lightTheme;

export default function PrivacyPolicy() {
  const { role, name } = useLocalSearchParams<{ role: string; name?: string }>();
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const goBack = () => router.back();

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const reachedBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (reachedBottom) setHasScrolledToEnd(true);
  };

  const handleAccept = () => {
    router.push({ pathname: "/(onboarding)/profileSetup4", params: { role, name } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={[styles.headerText, typography.heading]}>Privacy Policy</Text>
      </View>

      <View style={styles.container}>
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={100}
        >
          <Text style={[styles.policyText, typography.body]}>{PRIVACY_POLICY_TEXT}</Text>
        </ScrollView>

        {!hasScrolledToEnd && (
          <Text style={[styles.hint, typography.label]}>
            Scroll to the end to continue
          </Text>
        )}

        <TouchableOpacity
          style={[styles.acceptBtn, !hasScrolledToEnd && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={!hasScrolledToEnd}
        >
          <Text style={[styles.acceptBtnText, typography.subheading]}>I Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goBack} style={styles.backWrap}>
          <Text style={[styles.back, typography.label]}>Back</Text>
        </TouchableOpacity>

        <View style={styles.dotsWrap}>
          <ProgressDots total={4} current={3} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base.background },
  header: { backgroundColor: colors.brand.primary, paddingVertical: 18, paddingHorizontal: 20, height: 72, justifyContent: "center" },
  headerText: { color: "#fff" },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  scrollArea: {
    flex: 1,
    backgroundColor: colors.base.surfaceL1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.base.border,
  },
  scrollContent: { padding: 20 },
  policyText: { color: colors.text.primary, lineHeight: 20 },
  hint: { textAlign: "center", color: colors.text.secondary, marginTop: 8 },
  acceptBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  acceptBtnDisabled: { backgroundColor: colors.base.border },
  acceptBtnText: { color: "#fff" },
  backWrap: { alignSelf: "flex-start", marginTop: 10 },
  back: { textDecorationLine: "underline", color: colors.text.primary },
  dotsWrap: { marginTop: 12, marginBottom: 20, alignItems: "center" },
});