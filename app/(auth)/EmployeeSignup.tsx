// import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { API_BASE_URL } from "../../constants/api";
import { typography } from "../../theme/theme";
import BackButton from "../../components/backButton";
import ValidatedInput from "../../components/ValidatedInput";
import {
  isValidEmail,
  isValidPhone,
  isValidName,
} from "../../constants/validators";

export default function EmployeeSignup() {
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [nameChecking, setNameChecking] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    department: "",
    phone: "",
    email: "",
  });

  // Card-level error (e.g. "user already exists") shown below the card
  const [cardError, setCardError] = useState("");
  const nameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);

    if (!name.trim() || !isValidName(name)) {
      return;
    }

    nameDebounceRef.current = setTimeout(async () => {
      try {
        setNameChecking(true);
        const res = await fetch(`${API_BASE_URL}/check-name`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), role: "employee" }),
        });
        const data = await res.json();

        if (res.ok && !data.available) {
          setErrors((prev) => ({
            ...prev,
            name: "This name is already taken",
          }));
        }
      } catch (err) {
        // fail silently — don't block typing on a network hiccup
      } finally {
        setNameChecking(false);
      }
    }, 500);

    return () => {
      if (nameDebounceRef.current) clearTimeout(nameDebounceRef.current);
    };
  }, [name]);

  function validate() {
    const newErrors = {
      name: "",
      department: "",
      phone: "",
      email: "",
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = "Please enter your name";
      isValid = false;
    } else if (!isValidName(name)) {
      newErrors.name = "Name should only contain letters";
      isValid = false;
    }

    if (!department.trim()) {
      newErrors.department = "Please enter your department";
      isValid = false;
    } else if (!isValidName(department)) {
      newErrors.department = "Department should only contain letters";
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = "Please enter a phone number";
      isValid = false;
    } else if (phone.length !== 10) {
      newErrors.phone = "Enter a valid 10-digit phone number";
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!email.trim()) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }

  async function createAccount() {
    setCardError("");

    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({
        name: "",
        department: "",
        phone: "",
        email: "",
      });

      const signupResponse = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          role: "employee",
          department,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        const detail = (signupData.detail || "").toLowerCase();

        if (detail.includes("phone")) {
          setErrors((prev) => ({
            ...prev,
            phone: signupData.detail,
          }));
        } else if (detail.includes("name is already taken")) {
          setErrors((prev) => ({
            ...prev,
            name: "This name is already taken",
          }));
        } else if (detail.includes("already exists")) {
          setCardError("The user already exists");
        } else {
          setCardError(signupData.detail || "Signup failed");
        }
        return;
      }
      const otpResponse = await fetch(`${API_BASE_URL}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          role: "employee",
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        setCardError(otpData.detail || "Failed to send OTP");
        return;
      }

      router.push({
        pathname: "/(auth)/OtpVerify",
        params: {
          email,
          name,
          role: "employee",
          mode: "signup",
        },
      });
    } catch (error) {
      console.log(error);
      setCardError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.headerText, typography.heading]}>
          Employee Signup
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
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logo}
              />
            </View>

            <View style={[styles.card, cardError ? styles.cardError : null]}>
              <Text style={styles.title}>Create Employee Account</Text>

              <View style={{ width: "100%", alignItems: "center" }}>
                <ValidatedInput
                  value={name}
                  placeholder="Full Name"
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name)
                      setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  validator={isValidName}
                  errorMessage="Name should only contain letters"
                  externalError={errors.name}
                />

                <ValidatedInput
                  value={department}
                  placeholder="Department"
                  onChangeText={(text) => {
                    setDepartment(text);
                    if (errors.department)
                      setErrors((prev) => ({ ...prev, department: "" }));
                  }}
                  validator={isValidName}
                  errorMessage="Department should only contain letters"
                  externalError={errors.department}
                />

                <ValidatedInput
                  value={phone}
                  placeholder="Phone Number"
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone)
                      setErrors((prev) => ({ ...prev, phone: "" }));
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  validator={isValidPhone}
                  errorMessage="Enter a valid 10-digit phone number"
                  externalError={errors.phone}
                />

                <ValidatedInput
                  value={email}
                  placeholder="Email"
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email)
                      setErrors((prev) => ({ ...prev, email: "" }));
                    if (cardError) setCardError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  validator={isValidEmail}
                  errorMessage="Please enter a valid email"
                  externalError={errors.email}
                />
              </View>

              <View style={{ width: "100%" }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={createAccount}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {cardError ? (
              <Text style={styles.cardErrorText}>{cardError}</Text>
            ) : null}

            <View style={styles.login}>
              <Text style={styles.bottomText}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => router.replace("/(auth)/EmployeeLogin")}
              >
                <Text style={styles.loginT}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY = "#1A2744";
const ACCENT = "#E8870A";
const ERROR = "#D32F2F";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    alignItems: "center",
  },

  mainStyle: {
    alignItems: "center",
    width: "100%",
  },

  header: {
    width: "100%",
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  headerText: {
    color: "white",
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
    alignSelf: "center",
  },

  logoContainer: {
    marginTop: 35,
    justifyContent: "center",
    alignItems: "center",
    height: 120,
    width: 120,
    borderRadius: 60,
    backgroundColor: ACCENT,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  logo: {
    width: 115,
    height: 115,
    borderRadius: 60,
  },

  card: {
    marginTop: 30,
    alignItems: "center",
    width: "85%",
    backgroundColor: "white",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderWidth: 2,
    borderColor: "transparent",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },

  cardError: {
    borderColor: ERROR,
  },

  title: {
    textAlign: "center",
    fontSize: 18,
    // fontWeight: "700",
    color: PRIMARY,
    marginBottom: 4,
    fontFamily: "Poppins_400Regular",
  },

  cardErrorText: {
    color: ERROR,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    marginTop: 12,
    textAlign: "center",
  },

  button: {
    backgroundColor: ACCENT,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 14,

    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },

  buttonDisabled: {
    backgroundColor: "#6B7280",
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    // fontWeight: "700",
    fontFamily: "Poppins_400Regular",
    letterSpacing: 0.3,
  },

  bottomText: {
    color: "#6B7280",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    marginTop: 30,
  },

  login: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
  },

  loginT: {
    color: PRIMARY,
    fontFamily: "Poppins_600SemiBold",
    marginTop: 27,
    textDecorationLine: "underline",
  },
});
