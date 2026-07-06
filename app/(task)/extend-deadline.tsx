// app/(task)/extend-deadline.tsx
//
// Requires: npx expo install @react-native-community/datetimepicker
// Requires: extension_requests.sql run against your Supabase project

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

export default function ExtendDeadline() {
  const { colors } = useTheme();
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [newDeadline, setNewDeadline] = useState<Date | null>(null);
  const [reason, setReason] = useState("");

  React.useEffect(() => {
    if (!taskId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();
      if (error) console.error("Task fetch error:", error);
      setTask(data);
      setLoading(false);
    })();
  }, [taskId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
        <Text style={{ ...typography.body, color: colors.text.primary, margin: 20 }}>
          Task not found
        </Text>
      </SafeAreaView>
    );
  }

  const onChangeDate = (event: any, selected?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selected) setNewDeadline(selected);
  };

  const handleSubmit = async () => {
    if (!newDeadline) {
      Alert.alert("Pick a date", "Please choose a new deadline.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Add a reason", "Please tell us why you need an extension.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("extension_requests").insert({
      task_id: task.id,
      requested_by: task.assigned_to,
      current_deadline: task.deadline,
      requested_deadline: newDeadline.toISOString().split("T")[0],
      reason: reason.trim(),
    });

    setSubmitting(false);

    if (error) {
      // unique index "one_pending_request_per_task" throws code 23505 if one already exists
      if (error.code === "23505") {
        Alert.alert(
          "Not allowed",
          "A pending extension request already exists for this task."
        );
      } else {
        Alert.alert("Could not submit", error.message);
      }
      return;
    }

    Alert.alert("Request sent", "Your extension request has been sent to the admin.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 60,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={26}
          color={colors.brand.onPrimary}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.brand.onPrimary,
            marginLeft: 15,
          }}
        >
          Extend Deadline
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 25 }}>
        {/* Task Name */}
        <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Task</Text>
        <Text style={{ ...typography.heading, color: colors.text.primary, marginTop: 4 }}>
          {task.title}
        </Text>

        {/* Current Deadline (label, not editable) */}
        <View style={{ marginTop: 25 }}>
          <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
            Current Deadline
          </Text>
          <View
            style={{
              marginTop: 8,
              backgroundColor: colors.base.surfaceL2,
              borderColor: colors.base.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ ...typography.body, color: colors.text.primary }}>
              {task.deadline
                ? new Date(task.deadline).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "No deadline set"}
            </Text>
          </View>
        </View>

        {/* New Deadline Picker */}
        <View style={{ marginTop: 25 }}>
          <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
            New Deadline
          </Text>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={{
              marginTop: 8,
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                ...typography.body,
                color: newDeadline ? colors.text.primary : colors.text.secondary,
              }}
            >
              {newDeadline ? newDeadline.toISOString().split("T")[0] : "Select a date"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.brand.accent} />
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={newDeadline ?? new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={onChangeDate}
            />
          )}
        </View>

        {/* Reason */}
        <View style={{ marginTop: 25 }}>
          <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
            Reason for Extension
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why you need more time..."
            placeholderTextColor={colors.text.secondary}
            multiline
            numberOfLines={4}
            style={{
              marginTop: 8,
              minHeight: 100,
              backgroundColor: colors.base.surfaceL1,
              borderColor: colors.base.border,
              borderWidth: 1,
              borderRadius: 12,
              padding: 14,
              textAlignVertical: "top",
              ...typography.body,
              color: colors.text.primary,
            }}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={{
            marginTop: 30,
            height: 53,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.brand.accent,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.base.surfaceL1} />
          ) : (
            <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
              Request Deadline
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
