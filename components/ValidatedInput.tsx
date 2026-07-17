import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SUCCESS = "#2E7D32";
const ERROR = "#D32F2F";
const DEFAULT_BORDER = "#6B7280";
const FOCUS_BORDER = "#1A2744"; // matches your theme navy
const DEBOUNCE_MS = 600; // time of inactivity before showing error

interface ValidatedInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  validator?: (value: string) => boolean;
  errorMessage?: string;
  externalError?: string;
  helperText?: string;          // NEW
  containerStyle?: StyleProp<ViewStyle>;
}

const ValidatedInput: React.FC<ValidatedInputProps> = ({
  value,
  onChangeText,
  validator,
  errorMessage = "Invalid value",
  externalError,
  containerStyle,
  helperText,                   // NEW
  onBlur,
  onFocus,
  ...rest
}) => {
  const [showError, setShowError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isValid = validator ? validator(value) : false;

  useEffect(() => {
    // Clear any pending timer whenever the value changes
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length === 0) {
      // Empty field: no error while user hasn't typed anything
      setShowError(false);
      return;
    }

    if (isValid) {
      // Already valid: show tick immediately, no error
      setShowError(false);
      return;
    }

    // Invalid and non-empty: wait for a pause in typing, then show error
    debounceRef.current = setTimeout(() => {
      setShowError(true);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, isValid]);

  const localError = showError && validator ? errorMessage : "";
  const displayError = externalError || localError;
  const showTick = isValid && !externalError;
  const showCross = !!displayError;

  return (
    <View style={containerStyle}>
      <View style={styles.inputWrapper}>
        <TextInput
          {...rest}
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            // On blur, show error immediately too (no need to wait)
            if (value.length > 0 && validator && !isValid) {
              setShowError(true);
            }
            onBlur?.(e);
          }}
          style={[
            styles.input,
            // showTick ? styles.inputSuccess : null,
            isFocused && !showCross ? styles.inputFocused : null,
            showCross ? styles.inputError : null,
          ]}
        />
        {showTick && (
          <Ionicons name="checkmark-circle" size={21} color={SUCCESS} style={styles.icon} />
        )}
        {showCross && (
          <Ionicons name="close-circle" size={21} color={ERROR} style={styles.icon} />
        )}
      </View>
      {displayError ? (
        <Text style={styles.errorText}>{
          typeof displayError === "string" ? displayError : String(displayError)
        }</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{
          typeof helperText === "string" ? helperText : String(helperText)
        }</Text>
      ) : null}
    </View>
  );
};

export default ValidatedInput;

const styles = StyleSheet.create({
  helperText: {
    color: "#6B7280",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 4,
    marginLeft: 4,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    backgroundColor: "#E5E7EB",
    height: 50,
    width: 280,
    paddingLeft: 20,
    paddingRight: 40,
    borderRadius: 10,
    marginTop: 20,
    borderColor: DEFAULT_BORDER,
    borderWidth: 0.7,
  },
  inputSuccess: {
    borderColor: SUCCESS,
    backgroundColor: "#EAF7EC",
  },
  inputFocused: {
    borderColor: FOCUS_BORDER,
    borderWidth: 1.4,
    shadowColor: FOCUS_BORDER,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  inputError: {
    borderColor: ERROR,
    backgroundColor: "#FDECEC",
  },
  icon: {
    position: "absolute",
    right: 12,
    top: 34,
  },
  errorText: {
    color: ERROR,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 4,
    marginLeft: 4,
  },
});