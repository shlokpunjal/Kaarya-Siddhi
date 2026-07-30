import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useRef, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../constants/api";
import { typography } from "../../theme/theme";
import BackButton from "../../components/auth/backButton";
import { registerAndSavePushToken } from "../../lib/pushNotifications";
import { sendLoginNotification } from "../../utils/notifications";
import { wp, moderateScale } from "../../utils/responsive";
import TrainLoadingAnimation from "../../components/animation/TrainLoadingAnimation";

type TrainStatus = "idle" | "loading" | "success" | "error";

type VerifiedData = {
  role: string;
  email: string;
  workspace_id?: string | null;
  token: string;
  refresh_token: string;
};

// Pulled out of the component so the routing rules can be reasoned about
// (and tested) on their own, independent of animation/state concerns.
function getPostVerificationRoute(
  mode: string | undefined,
  data: VerifiedData,
  name?: string,
) {
  if (mode === "signup") {
    if (data.role === "admin") {
      return {
        pathname: "/(onboarding)/profileSetup1" as const,
        params: { role: "admin", name },
      };
    }

    if (data.role === "employee") {
      return {
        pathname: "/(auth)/RequestAdmin" as const,
        params: { email: data.email, name, mode: "signup" },
      };
    }
  }

  if (data.role === "admin") {
    return { pathname: "/(admin)" as const };
  }

  if (data.role === "employee" && !data.workspace_id) {
    return {
      pathname: "/(auth)/RequestAdmin" as const,
      params: { email: data.email, mode: "login" },
    };
  }

  return { pathname: "/(employee)" as const };
}

const OtpVerify = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [trainStatus, setTrainStatus] = useState<TrainStatus>("idle");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(60)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const inputsFade = useRef(new Animated.Value(1)).current;
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const isVerifyingRef = useRef(false);
  const pendingVerifiedDataRef = useRef<VerifiedData | null>(null);
  const [cooldown, setCooldown] = useState(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { email, ph, role, mode, name } = useLocalSearchParams<{
    email: string;
    ph?: string;
    role: string;
    mode: string;
    name?: string;
  }>();
  const { saveSession } = useAuth();
  const [otpError, setOtpError] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    startCooldown();
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(inputsFade, {
      toValue: isVerifying ? 0.4 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isVerifying]);

  const startCooldown = () => {
    setCooldown(30);
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const proceedAfterVerification = (data: VerifiedData) => {
    if (mode !== "signup") {
      sendLoginNotification(data.email).catch(() => {
        // best-effort — a failed notification shouldn't block navigation
      });
    }

    router.replace(getPostVerificationRoute(mode, data, name));
  };

  // Fired once the train has visibly arrived at the end of the track and
  // faded out — then we navigate. The train is already invisible by the
  // time this fires (its own fade-out already ran), so this only needs a
  // short beat rather than a long fixed pause before handing off.
  const handleTrainFinished = () => {
    const data = pendingVerifiedDataRef.current;
    pendingVerifiedDataRef.current = null;
    setTimeout(() => {
      if (data) proceedAfterVerification(data);
    }, 150);
  };

  const verifyOTP = async (code?: string) => {
    if (isVerifyingRef.current) return;

    const otpCode = code ?? otp.join("");
    if (otpCode.length !== 6) {
      setOtpError("Enter a valid 6-digit OTP");
      return;
    }

    isVerifyingRef.current = true;

    // Just enough to keep the loading animation from flashing on very fast
    // responses — trimmed down from 900ms since it was stacking with the
    // train animation and the post-finish delay to make verification feel
    // stuck for ~2.8s even on quick networks.
    const MIN_VISIBLE_MS = 500;
    const startTime = Date.now();

    try {
      setIsVerifying(true);
      setOtpError("");
      setTrainStatus("loading");

      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: otpCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_VISIBLE_MS) {
          await new Promise((res) => setTimeout(res, MIN_VISIBLE_MS - elapsed));
        }

        setTrainStatus("error");

        const detail = (data.detail || "").toLowerCase();

        // Name got taken by someone else during the OTP window —
        // this isn't a wrong-OTP issue, so send them back to signup
        if (detail.includes("name was just taken")) {
          const backPath =
            role === "admin" ? "/(auth)/AdminSignup" : "/(auth)/EmployeeSignup";

          router.replace({
            pathname: backPath,
            params: {
              prefillNameTaken: "1",
            },
          });
          return;
        }

        setOtpError(data.detail || "Invalid OTP");
        return;
      }
      await saveSession(
        data.token,
        ph?.toString() ?? "",
        data.email,
        data.role,
        data.workspace_id,
        data.refresh_token,
      );
      registerAndSavePushToken().catch(() => {
        // best-effort — push registration failures shouldn't block login
      });

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_VISIBLE_MS) {
        await new Promise((res) => setTimeout(res, MIN_VISIBLE_MS - elapsed));
      }

      // Don't navigate yet — wait for the train to finish its arrival
      // animation first (see handleTrainFinished).
      pendingVerifiedDataRef.current = data;
      setTrainStatus("success");
    } catch (error) {
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_VISIBLE_MS) {
        await new Promise((res) => setTimeout(res, MIN_VISIBLE_MS - elapsed));
      }
      setTrainStatus("error");
      setOtpError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
      isVerifyingRef.current = false;
    }
  };

  const resendOTP = async () => {
    try {
      setOtpError("");
      setResendMessage("");

      const response = await fetch(`${API_BASE_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.detail || "Unable to resend OTP");
        return;
      }

      setResendMessage("OTP sent successfully");
      startCooldown();
    } catch (error) {
      setOtpError("Unable to resend OTP.");
    }
  };

  const isOnCooldown = cooldown > 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.mainbar}>
        <BackButton />
        <Text style={[styles.maintext, typography.heading]}>
          OTP Verification
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainStyle}>
            <View style={styles.imagestyle}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.imageStyling}
              />
            </View>
            <View style={styles.trainAboveCard}>
              <TrainLoadingAnimation
                status={trainStatus}
                onFinished={handleTrainFinished}
              />
            </View>
            <Animated.View
              style={[
                styles.divi,
                (isOnCooldown || otpError || resendMessage) &&
                styles.diviExpanded,
              ]}
            >
              <Text style={[styles.divtext]}>Login to your workspace</Text>

              <Animated.View
                style={{ width: "100%", alignItems: "center", opacity: inputsFade }}
                pointerEvents={isVerifying ? "none" : "auto"}
              >
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.otpInput,
                        focusedIndex === index && styles.activeOtpBox,
                        digit && styles.filledOtpBox,
                        otpError && styles.otpError,
                      ]}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(-1)}
                      value={digit}
                      cursorColor="#E8870A"
                      selectionColor="#E8870A"
                      keyboardType="number-pad"
                      maxLength={1}
                      editable={!isVerifying}
                      onChangeText={(text) => {
                        const number = text.replace(/[^0-9]/g, "");

                        const updated = [...otp];
                        updated[index] = number;

                        setOtp(updated);

                        if (otpError) setOtpError("");
                        if (resendMessage) setResendMessage("");

                        if (number && index < 5) {
                          setFocusedIndex(index + 1);
                          inputRefs.current[index + 1]?.focus();
                        }

                        const otpCode = updated.join("");

                        if (otpCode.length === 6) {
                          setTimeout(() => {
                            verifyOTP(otpCode);
                          }, 100);
                        }
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if (
                          nativeEvent.key === "Backspace" &&
                          !otp[index] &&
                          index > 0
                        ) {
                          setFocusedIndex(index - 1);
                          inputRefs.current[index - 1]?.focus();
                        }
                      }}
                    />
                  ))}
                </View>
                {otpError ? (
                  <Text style={styles.errorText}>{otpError}</Text>
                ) : null}
                {resendMessage ? (
                  <Text style={styles.successText}>{resendMessage}</Text>
                ) : null}
              </Animated.View>

              <View style={{ width: "100%" }}>
                <TouchableOpacity
                  style={[
                    styles.LoginStyle,
                    (otp.join("").length < 6 || isVerifying) && {
                      opacity: 0.5,
                    },
                  ]}
                  disabled={otp.join("").length < 6 || isVerifying}
                  onPress={() => verifyOTP(otp.join(""))}
                >
                  {isVerifying ? (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={styles.LoginText}>Verifying</Text>
                      <View style={{ width: 18, height: 18, marginLeft: 8 }}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.LoginText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              </View>

              {isOnCooldown && (
                <Text style={styles.resendText}>Resend in : {cooldown}</Text>
              )}

              {!isOnCooldown && (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={resendOTP}
                >
                  <Text style={styles.LoginText}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OtpVerify;

const ERROR = "#D32F2F";
const SUCCESS = "#2E7D32";

const styles = StyleSheet.create({
  trainAboveCard: {
    width: "85%",
    marginTop: 30,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  setText: {
    color: "white",
    fontSize: 15,
  },
  SetStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8870A",
    height: moderateScale(48),
    width: "50%",
    borderRadius: 10,
    elevation: 4,
    top: 160,
  },
  createStyle: {
    color: "#6B7280",
    top: 150,
    fontSize: 16,
  },
  LoginText: {
    color: "#FFFFFF",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  LoginStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2744",
    height: moderateScale(52),
    width: "100%",
    borderRadius: 16,
    marginTop: 14,
    shadowColor: "#1A2744",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  resendButton: {
    width: "100%",
    height: moderateScale(52),
    borderRadius: 16,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2744",
    shadowColor: "#1A2744",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
  },
  resendText: {
    marginTop: 20,
    color: "#E8870A",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  errorText: {
    color: ERROR,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 6,
    marginLeft: 4,
  },
  successText: {
    color: SUCCESS,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 6,
    marginLeft: 4,
  },
  mainStyle: {
    alignItems: "center",
    justifyContent: "center",
  },
  mainbar: {
    backgroundColor: "#1A2744",
    padding: wp(4.8),
  },
  maintext: {
    color: "white",
    fontSize: 18,
    marginLeft: 40,
    marginBottom: 1,
  },
  imagestyle: {
    justifyContent: "center",
    alignItems: "center",
    height: moderateScale(120),
    width: moderateScale(120),
    marginTop: 60,
    borderRadius: moderateScale(96),
    backgroundColor: "#E8870A",
  },
  imageStyling: {
    height: moderateScale(115),
    width: moderateScale(115),
    borderRadius: moderateScale(96),
    bottom: 0,
  },
  divi: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    width: "85%",
    borderRadius: 24,

    paddingHorizontal: wp(5.3),
    paddingTop: 22,
    paddingBottom: 18,

    marginTop: 10,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,

    elevation: 10,

    overflow: "visible",
  },
  diviExpanded: {
    paddingBottom: 26,
  },
  divtext: {
    fontSize: 18,
    color: "#1A2744",
    marginBottom: 8,
    fontFamily: "Poppins_400Regular",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 14,
  },
  otpInput: {
    width: moderateScale(42),
    height: moderateScale(52),
    marginHorizontal: 3.5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    fontSize: 22,
    color: "#1A2744",
    textAlign: "center",
  },

  otpError: {
    borderColor: "#D32F2F",
  },

  activeOtpBox: {
    borderColor: "#E8870A",
    backgroundColor: "#FFF8EF",
    borderWidth: 2,

    shadowColor: "#E8870A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 6,

    elevation: 5,

    transform: [{ scale: 1.04 }],
  },
  filledOtpBox: {
    borderColor: "#E8870A",
  },
});