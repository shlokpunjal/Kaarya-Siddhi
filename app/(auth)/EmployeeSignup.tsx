import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { API_BASE_URL } from "../../constants/api";
import { typography } from '../../theme/theme';


export default function EmployeeSignup() {
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    employeeId: "",
    department: "",
    phone: "",
    email: "",
  });

  function validate() {
    const newErrors = {
      name: "",
      employeeId: "",
      department: "",
      phone: "",
      email: "",
    };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = "Please enter your name";
      isValid = false;
    }

    if (!employeeId.trim()) {
      newErrors.employeeId = "Please enter your employee ID";
      isValid = false;
    }

    if (!department.trim()) {
      newErrors.department = "Please enter your department";
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = "Please enter a phone number";
      isValid = false;
    } else if (phone.length !== 10) {
      newErrors.phone = "Enter a valid 10-digit phone number";
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
    if (!validate()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({
        name: "",
        employeeId: "",
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
          employee_id: employeeId,
          department,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        const detail = (signupData.detail || "").toLowerCase();

        if (detail.includes("employee") && detail.includes("id")) {
          setErrors((prev) => ({
            ...prev,
            employeeId: signupData.detail,
          }));
        } else if (detail.includes("phone")) {
          setErrors((prev) => ({
            ...prev,
            phone: signupData.detail,
          }));
        } else if (detail.includes("exist")) {
          setErrors((prev) => ({
            ...prev,
            email: "The user already exists",
          }));
        } else {
          setErrors((prev) => ({
            ...prev,
            email: signupData.detail || "Signup failed",
          }));
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
        setErrors((prev) => ({
          ...prev,
          email: otpData.detail || "Failed to send OTP",
        }));
        return;
      }

      router.push({
        pathname: "/(auth)/OtpVerify",
        params: {
          email,
          role: "employee",
          mode: "signup",
        },
      });
    } catch (error) {
      console.log(error);
      setErrors((prev) => ({
        ...prev,
        email: "Something went wrong. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerText, typography.heading]}>Employee Signup</Text>
      </View>

      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/logo.jpeg")}
          style={styles.logo}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Create Employee Account</Text>

        <TextInput
          style={[styles.input, errors.name ? styles.inputError : null]}
          placeholder="Full Name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
          }}
        />
        {errors.name ? (
          <Text style={styles.errorText}>{errors.name}</Text>
        ) : null}

        {/* <TextInput
          style={[
            styles.input,
            errors.employeeId ? styles.inputError : null,
          ]}
          placeholder="Employee ID"
          value={employeeId}
          onChangeText={(text) => {
            setEmployeeId(text);
            if (errors.employeeId)
              setErrors((prev) => ({ ...prev, employeeId: "" }));
          }}
        /> */}
        {/* {errors.employeeId ? (
          <Text style={styles.errorText}>{errors.employeeId}</Text>
        ) : null} */}

        <TextInput
          style={[
            styles.input,
            errors.department ? styles.inputError : null,
          ]}
          placeholder="Department"
          value={department}
          onChangeText={(text) => {
            setDepartment(text);
            if (errors.department)
              setErrors((prev) => ({ ...prev, department: "" }));
          }}
        />
        {errors.department ? (
          <Text style={styles.errorText}>{errors.department}</Text>
        ) : null}

        <TextInput
          style={[styles.input, errors.phone ? styles.inputError : null]}
          placeholder="Phone Number"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
          }}
        />
        {errors.phone ? (
          <Text style={styles.errorText}>{errors.phone}</Text>
        ) : null}

        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
          }}
        />
        {errors.email ? (
          <Text style={styles.errorText}>{errors.email}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.button}
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

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/EmployeeLogin")}
      >
        <Text style={styles.bottomText}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
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
    alignItems: "center",
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
  },

  logoContainer: {
    marginTop: 35,
  },

  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  card: {
    marginTop: 30,
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },

  title: {
    textAlign: "center",
    fontSize: 20,
    color: PRIMARY,
    marginBottom: 20,
    fontFamily: "Poppins_600SemiBold",
  },

  input: {
    height: 55,
    backgroundColor: "#EEF2F7",
    borderRadius: 12,
    paddingHorizontal: 18,
    marginBottom: 6,
    fontFamily: "Poppins_400Regular",
    borderWidth: 1,
    borderColor: "transparent",
  },

  inputError: {
    borderColor: ERROR,
    backgroundColor: "#FDECEC",
  },

  errorText: {
    color: ERROR,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginBottom: 10,
    marginLeft: 4,
  },

  button: {
    backgroundColor: ACCENT,
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
  },

  bottomText: {
    marginTop: 20,
    color: PRIMARY,
    fontFamily: "Poppins_500Medium",
  },
});