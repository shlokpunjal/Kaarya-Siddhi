
// Requires: npx expo install @react-native-community/datetimepicker
// Requires: extension_requests.sql run against your Supabase project

// On submit, the request row itself is the only thing written — no
// `notifications` row is created for it. Admins are alerted via a push-only
// send (sendPushOnly), and the admin's Requests screen reads pending
// extension requests straight from extension_requests, scoped to workspace.

// UX note: success feedback fires immediately after the insert succeeds —
// admin push notifications are sent in the background afterward and never
// block or delay the person's own "request sent" confirmation.

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { sendPushOnly } from "../../lib/notify";
import { wp, moderateScale } from "../../utils/responsive";
import { useToast } from "../../context/ToastContext";
import { toLocalDateString } from "../../utils/dateFormat";

export default function ExtendDeadline() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const { showToast } = useToast();

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

  // New deadline must be after the task's *current* deadline, not just after
  // today — so the picker only lets people move the date forward from where
  // it already stands. Falls back to today if the task has no deadline set.
  const minSelectableDate = (() => {
    if (!task.deadline) return new Date();
    const current = new Date(task.deadline);
    const nextDay = new Date(current);
    nextDay.setDate(current.getDate() + 1);
    return nextDay;
  })();

  const onChangeDate = (event: any, selected?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (selected) setNewDeadline(selected);
  };

  const handleSubmit = async () => {
    if (!newDeadline) {
      showToast("Please choose a new deadline.", "error");
      return;
    }
    if (!reason.trim()) {
      showToast("Please tell us why you need an extension.", "error");
      return;
    }

    setSubmitting(true);

    const { error, data: insertedRows } = await supabase
      .from("extension_requests")
      .insert({
        task_id: task.id,
        requested_by: task.assigned_to,
        workspace_id: task.workspace_id,
        current_deadline: task.deadline,
        requested_deadline: toLocalDateString(newDeadline),
        reason: reason.trim(),
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      // unique index "one_pending_request_per_task" throws code 23505 if one already exists
      if (error.code === "23505") {
        showToast("A pending extension request already exists for this task.", "error");
      } else {
        showToast(error.message || "Could not submit your request", "error");
      }
      return;
    }

    // Show success right away — don't make the person wait on push delivery
    // to someone else's device.
    showToast("Your extension request has been sent to the admin.", "success");
    setTimeout(() => router.back(), 900);

    // Notify admins in the background. Fire-and-forget: a slow or failed
    // push should never block or fail the person's own request confirmation.
    if (insertedRows) {
      (async () => {
        const { data: admins } = await supabase
          .from("users")
          .select("id")
          .eq("workspace_id", task.workspace_id)
          .eq("role", "admin");

        if (admins) {
          admins.forEach((admin) => {
            sendPushOnly(
              admin.id,
              "New Extension Request",
              `A new deadline extension was requested for "${task.title}".`,
              { type: "extension_request", extension_request_id: insertedRows.id, taskId: task.id }
            ).catch((err) => console.log("Admin push failed:", err));
          });
        }
      })();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: moderateScale(60),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 15,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={moderateScale(26)}
          color={colors.brand.onPrimary}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.brand.onPrimary,
            marginLeft: moderateScale(15),
          }}
        >
          Extend Deadline
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: wp(6.7) }}>
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
              {newDeadline ? toLocalDateString(newDeadline) : "Select a date"}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.brand.accent} />
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={newDeadline ?? minSelectableDate}
              mode="date"
              minimumDate={minSelectableDate}
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
            height: moderateScale(53),
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
