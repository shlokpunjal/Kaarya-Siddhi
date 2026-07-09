import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
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
import BackButton from "../../components/backButton";
import AnimatedBorderCard from "../../components/AnimatedBorderCard";
import { registerPushToken } from "../../utils/pushToken";

// import { sendLoginNotification } from "../../utils/notifications";
import { sendLoginNotification } from "../../utils/notifications";

const OtpVerify = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(60)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const [cooldown, setCooldown] = useState(30); // starts at 30 immediately
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

  // Auto-start the 30s cooldown when page loads
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

  const verifyOTP = async (code?: string) => {
    const otpCode = code ?? otp.join("");
    if (otpCode.length !== 6) {
      setOtpError("Enter a valid 6-digit OTP");
      return;
    }

    try {
      setOtpError("");

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
        setOtpError(data.detail || "Invalid OTP");
        return;
      }

      console.log("Before saveSession");

      await saveSession(
        data.token,
        ph?.toString() ?? "",
        data.email,
        data.role,
        data.workspace_id,
        data.refresh_token
      ); console.log("✅ Save session completed");
      registerPushToken().catch((err) => console.log("Push token registration failed:", err));

      console.log("OTP DATA:", data);

      console.log("MODE:", mode);
      console.log("ROLE:", data.role);
      console.log("WORKSPACE:", data.workspace_id);

      console.log("After saveSession");
      const SecureStore = require("expo-secure-store");

      console.log(
        "Access Token After Save:",
        await SecureStore.getItemAsync("token")
      );

      // console.log(
      //   "Refresh Token After Save:",
      //   await SecureStore.getItemAsync("refreshToken")
      // );
      // ---------- SIGNUP FLOW → go through onboarding first ----------
      if (mode === "signup") {
        if (data.role === "admin") {
          router.replace({
            pathname: "/(onboarding)/profileSetup1",
            params: { role: "admin", name },
          });
          return;
        }

        if (data.role === "employee") {
          router.replace({
            pathname: "/(auth)/RequestAdmin",
            params: { email: data.email, name }, // ← add name
          });
          return;
        }
      }

      console.log("MODE:", mode);
      console.log("ROLE:", data.role);
      console.log("WORKSPACE:", data.workspace_id);

      // ---------- LOGIN FLOW ----------
      sendLoginNotification(data.email).catch((err) =>
        console.log("Login notification failed:", err),
      );

      if (data.role === "admin") {
        router.replace("/(admin)");
        return;
      }

      if (data.role === "employee" && !data.workspace_id) {
        router.replace({
          pathname: "/(auth)/RequestAdmin",
          params: { email: data.email },
        });
        return;
      }
      console.log("Going employee dashboard");

      router.replace("/(employee)");
    } catch (error: any) {
      console.log("FULL ERROR:", error);
      console.log("ERROR MESSAGE:", error?.message);
      console.log("ERROR STACK:", error?.stack);

      console.log(error);
      setOtpError("Verification failed. Please try again.");
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
      console.log(error);
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

            {/* Card — grows when cooldown or messages are active */}
            <Animated.View
              style={[
                styles.divi,
                (isOnCooldown || otpError || resendMessage) &&
                styles.diviExpanded,
              ]}
            >
              <Text style={[styles.divtext]}>Login to your workspace</Text>
              <View>
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
                      onChangeText={(text) => {
                        const number = text.replace(/[^0-9]/g, "");

                        const updated = [...otp];
                        updated[index] = number;

                        setOtp(updated);

                        if (otpError) setOtpError("");

                        if (number && index < 5) {
                          setFocusedIndex(index + 1);
                          inputRefs.current[index + 1]?.focus();
                        }

                        // Auto submit when all 6 digits are entered
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
              </View>

              {/* Verify OTP button */}
              <View style={{ width: "100%" }}>
                <TouchableOpacity
                  style={[
                    styles.LoginStyle,
                    otp.join("").length < 6 && {
                      opacity: 0.5,
                    },
                  ]}
                  disabled={otp.length < 6}
                  onPress={() => verifyOTP(otp.join(""))}
                >
                  <Text style={styles.LoginText}>Verify OTP</Text>
                </TouchableOpacity>
              </View>

              {/* Countdown text — visible during cooldown */}
              {isOnCooldown && (
                <Text style={styles.resendText}>Resend in : {cooldown}</Text>
              )}

              {/* Resend button — appears only after cooldown ends */}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  setText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  SetStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8870A",
    height: 48,
    width: "50%",
    borderRadius: 10,
    elevation: 4,
    top: 160,
  },
  createStyle: {
    color: "#6B7280",
    top: 150,
    fontWeight: "700",
    fontSize: 16,
  },
  LoginText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  LoginStyle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A2744",
    height: 52,
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
    height: 52,
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
  input: {
    backgroundColor: "#E5E7EB",
    height: 48,
    width: 280,
    justifyContent: "center",
    paddingLeft: 20,
    borderRadius: 10,
    marginTop: 16,
    borderColor: "#6B7280",
    borderWidth: 1,
  },
  inputError: {
    borderColor: ERROR,
    backgroundColor: "#FDECEC",
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
    padding: 18,
  },
  maintext: {
    color: "white",
    fontSize: 18,
    alignSelf: "center",
  },
  imagestyle: {
    justifyContent: "center",
    alignItems: "center",
    height: 120,
    width: 120,
    marginTop: 60,
    borderRadius: 96,
    backgroundColor: "#E8870A",
  },
  imageStyling: {
    height: 115,
    width: 115,
    borderRadius: 96,
    bottom: 0,
  },
  divi: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    width: "85%",
    borderRadius: 24,

    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,

    marginTop: 60,

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
    fontWeight: "700",
    color: "#1A2744",
    marginBottom: 8,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 14,
  },
  otpInput: {
    width: 42,
    height: 52,
    marginHorizontal: 3.5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D8DEE9",
    backgroundColor: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    color: "#1A2744",
    textAlign: "center",
  },

  otpError: {
    borderColor: "#D32F2F",
  },

  otpBoxes: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  otpBox: {
    width: 40,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3.5,
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

  errorOtpBox: {
    borderColor: "#D32F2F",
  },

  otpDigit: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A2744",
  },
});