// // Admin's review screen for a single extension request.
// // Visually styled like the employee's Extend Deadline form (task name, deadline
// // boxes, reason box) but repurposed for the admin: everything is read-only,
// // and if the request is still pending, Accept / Reject actions appear at the
// // bottom (with an optional note, confirmed via a modal).
// //
// // Realtime-synced: if the request gets decided from another device/session
// // while this screen is open, the UI updates live.

// import React, { useState, useEffect, useRef } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   Modal,
//   Alert,
//   ScrollView,
//   ActivityIndicator,
// } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { Ionicons } from "@expo/vector-icons";
// import { useLocalSearchParams, useRouter } from "expo-router";
// import type { RealtimeChannel } from "@supabase/supabase-js";
// import { useTheme } from "../../context/ThemeContext";
// import { typography } from "../../theme/theme";
// import { supabase } from "../../lib/supabase";

// const statusMeta = (colors: any, status: string) => {
//   if (status === "accepted")
//     return { color: colors.status.completed, icon: "checkmark-circle-outline" as const, label: "Accepted" };
//   if (status === "rejected")
//     return { color: colors.status.overdue, icon: "close-circle-outline" as const, label: "Rejected" };
//   return { color: colors.status.pending, icon: "time-outline" as const, label: "Pending" };
// };

// export default function AdminRequestReview() {
//   const { colors } = useTheme();
//   const router = useRouter();
//   const { requestId } = useLocalSearchParams<{ requestId: string }>();

//   const [request, setRequest] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [deciding, setDeciding] = useState(false);

//   const [modalVisible, setModalVisible] = useState(false);
//   const [pendingDecision, setPendingDecision] = useState<"accepted" | "rejected" | null>(null);
//   const [adminNote, setAdminNote] = useState("");

//   const channelRef = useRef<RealtimeChannel | null>(null);

//   const fetchRequest = async () => {
//     const { data, error } = await supabase
//       .from("extension_requests")
//       .select("*, tasks(title, priority, assigned_to, deadline)")
//       .eq("id", requestId)
//       .single();

//     if (error) console.error("Error fetching request:", error);
//     setRequest(data);
//     setLoading(false);
//   };

//   useEffect(() => {
//     if (!requestId) return;
//     setLoading(true);
//     fetchRequest();

//     const channel = supabase
//       .channel(`extension_request_${requestId}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "extension_requests",
//           filter: `id=eq.${requestId}`,
//         },
//         () => {
//           fetchRequest();
//         }
//       )
//       .subscribe();

//     channelRef.current = channel;

//     return () => {
//       if (channelRef.current) {
//         supabase.removeChannel(channelRef.current);
//         channelRef.current = null;
//       }
//     };
//   }, [requestId]);

//   if (loading) {
//     return (
//       <SafeAreaView
//         style={{
//           flex: 1,
//           backgroundColor: colors.base.background,
//           alignItems: "center",
//           justifyContent: "center",
//         }}
//       >
//         <ActivityIndicator size="large" color={colors.brand.primary} />
//       </SafeAreaView>
//     );
//   }

//   if (!request) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
//         <Text style={{ ...typography.body, color: colors.text.primary, margin: 20 }}>
//           Request not found
//         </Text>
//       </SafeAreaView>
//     );
//   }

//   const meta = statusMeta(colors, request.status);

//   const openConfirm = (decision: "accepted" | "rejected") => {
//     setPendingDecision(decision);
//     setAdminNote("");
//     setModalVisible(true);
//   };

//   const confirmDecision = async () => {
//     if (!pendingDecision) return;
//     setDeciding(true);

//     const decidedAt = new Date().toISOString();
//     const noteToSave = adminNote.trim() || null;

//     const { error } = await supabase
//       .from("extension_requests")
//       .update({
//         status: pendingDecision,
//         admin_note: noteToSave,
//         decided_at: decidedAt,
//       })
//       .eq("id", request.id);

//     // If accepted, also push the new deadline onto the task itself.
//     if (!error && pendingDecision === "accepted") {
//       await supabase
//         .from("tasks")
//         .update({ deadline: request.requested_deadline })
//         .eq("id", request.task_id);
//     }

//     setDeciding(false);
//     setModalVisible(false);

//     if (error) {
//       Alert.alert("Could not update", error.message);
//       return;
//     }

//     // Update local state immediately so the screen reflects the decision
//     // right away, instead of waiting for the realtime round-trip (or
//     // requiring the admin to leave and come back to see it refresh).
//     setRequest((prev: any) => ({
//       ...prev,
//       status: pendingDecision,
//       admin_note: noteToSave,
//       decided_at: decidedAt,
//     }));

//     Alert.alert(
//       pendingDecision === "accepted" ? "Request accepted" : "Request rejected",
//       "The employee will be notified.",
//       [{ text: "OK", onPress: () => router.back() }]
//     );
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
//       {/* Header */}
//       <View
//         style={{
//           backgroundColor: colors.brand.primary,
//           height: 60,
//           flexDirection: "row",
//           alignItems: "center",
//           paddingHorizontal: 15,
//         }}
//       >
//         <Ionicons
//           onPress={() => router.back()}
//           name="arrow-back"
//           size={26}
//           color={colors.brand.onPrimary ?? colors.base.surfaceL1}
//         />
//         <Text
//           style={{
//             ...typography.heading,
//             color: colors.brand.onPrimary ?? colors.base.surfaceL1,
//             marginLeft: 15,
//           }}
//         >
//           Review Request
//         </Text>
//       </View>

//       <ScrollView contentContainerStyle={{ padding: 25 }}>
//         {/* Task name + status badge */}
//         <View
//           style={{
//             flexDirection: "row",
//             alignItems: "flex-start",
//             justifyContent: "space-between",
//           }}
//         >
//           <View style={{ flex: 1, marginRight: 10 }}>
//             <Text style={{ ...typography.heading3, color: colors.text.secondary }}>Task</Text>
//             <Text style={{ ...typography.heading, color: colors.text.primary, marginTop: 4 }}>
//               {request.tasks?.title ?? "Untitled Task"}
//             </Text>
//           </View>
//           <View
//             style={{
//               flexDirection: "row",
//               alignItems: "center",
//               gap: 4,
//               backgroundColor: meta.color + "22",
//               borderRadius: 10,
//               paddingHorizontal: 10,
//               paddingVertical: 5,
//               marginTop: 22,
//             }}
//           >
//             <Ionicons name={meta.icon} size={13} color={meta.color} />
//             <Text
//               style={{ ...typography.label, color: meta.color, textTransform: "capitalize" }}
//             >
//               {meta.label}
//             </Text>
//           </View>
//         </View>

//         <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 8 }}>
//           Requested by {request.tasks?.assigned_to ?? "—"}
//         </Text>

//         {/* Current Deadline (read-only) */}
//         <View style={{ marginTop: 25 }}>
//           <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
//             Current Deadline
//           </Text>
//           <View
//             style={{
//               marginTop: 8,
//               backgroundColor: colors.base.surfaceL2,
//               borderColor: colors.base.border,
//               borderWidth: 1,
//               borderRadius: 12,
//               paddingVertical: 12,
//               paddingHorizontal: 16,
//             }}
//           >
//             <Text style={{ ...typography.body, color: colors.text.primary }}>
//               {new Date(request.current_deadline).toLocaleDateString("en-IN", {
//                 day: "2-digit",
//                 month: "short",
//                 year: "numeric",
//               })}
//             </Text>
//           </View>
//         </View>

//         {/* Requested Deadline (read-only, highlighted) */}
//         <View style={{ marginTop: 25 }}>
//           <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
//             Requested Deadline
//           </Text>
//           <View
//             style={{
//               marginTop: 8,
//               backgroundColor: colors.base.surfaceL1,
//               borderColor: colors.brand.accent,
//               borderWidth: 1,
//               borderRadius: 12,
//               paddingVertical: 12,
//               paddingHorizontal: 16,
//               flexDirection: "row",
//               alignItems: "center",
//               justifyContent: "space-between",
//             }}
//           >
//             <Text style={{ ...typography.body, color: colors.brand.accent }}>
//               {new Date(request.requested_deadline).toLocaleDateString("en-IN", {
//                 day: "2-digit",
//                 month: "short",
//                 year: "numeric",
//               })}
//             </Text>
//             <Ionicons name="calendar" size={20} color={colors.brand.accent} />
//           </View>
//         </View>

//         {/* Reason (read-only) */}
//         <View style={{ marginTop: 25 }}>
//           <Text style={{ ...typography.heading3, color: colors.text.secondary }}>
//             Employee's Reason
//           </Text>
//           <View
//             style={{
//               marginTop: 8,
//               minHeight: 90,
//               backgroundColor: colors.base.surfaceL2,
//               borderColor: colors.base.border,
//               borderWidth: 1,
//               borderRadius: 12,
//               padding: 14,
//             }}
//           >
//             <Text style={{ ...typography.body, color: colors.text.primary }}>
//               {request.reason}
//             </Text>
//           </View>
//         </View>

//         {/* Decision summary — shown once already decided */}
//         {request.status !== "pending" && (
//           <View
//             style={{
//               marginTop: 25,
//               backgroundColor: meta.color + "11",
//               borderColor: meta.color + "44",
//               borderWidth: 1,
//               borderRadius: 14,
//               padding: 16,
//             }}
//           >
//             <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
//               <Ionicons name={meta.icon} size={20} color={meta.color} />
//               <Text style={{ ...typography.heading3, color: meta.color }}>
//                 You {meta.label.toLowerCase()} this request
//               </Text>
//             </View>
//             {request.admin_note ? (
//               <Text style={{ ...typography.body, color: colors.text.primary }}>
//                 {request.admin_note}
//               </Text>
//             ) : (
//               <Text style={{ ...typography.body, color: colors.text.secondary }}>
//                 No note was left.
//               </Text>
//             )}
//             {request.decided_at && (
//               <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 8 }}>
//                 Decided on{" "}
//                 {new Date(request.decided_at).toLocaleDateString("en-IN", {
//                   day: "2-digit",
//                   month: "short",
//                   year: "numeric",
//                 })}
//               </Text>
//             )}
//           </View>
//         )}

//         {/* Accept / Reject — only while pending */}
//         {request.status === "pending" && (
//           <View style={{ flexDirection: "row", gap: 14, marginTop: 30 }}>
//             <TouchableOpacity
//               onPress={() => openConfirm("accepted")}
//               style={{
//                 flex: 1,
//                 height: 53,
//                 borderRadius: 10,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 backgroundColor: colors.status.completed,
//               }}
//             >
//               <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
//                 Accept
//               </Text>
//             </TouchableOpacity>
//             <TouchableOpacity
//               onPress={() => openConfirm("rejected")}
//               style={{
//                 flex: 1,
//                 height: 53,
//                 borderRadius: 10,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 backgroundColor: colors.status.overdue,
//               }}
//             >
//               <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
//                 Reject
//               </Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </ScrollView>

//       {/* Confirm modal — optional note + second-time confirm */}
//       <Modal visible={modalVisible} transparent animationType="fade">
//         <View
//           style={{
//             flex: 1,
//             backgroundColor: "rgba(0,0,0,0.4)",
//             alignItems: "center",
//             justifyContent: "center",
//           }}
//         >
//           <View
//             style={{
//               backgroundColor: colors.base.surfaceL1,
//               borderRadius: 20,
//               padding: 22,
//               width: 300,
//             }}
//           >
//             <Text style={{ ...typography.heading3, color: colors.text.primary }}>
//               {pendingDecision === "accepted" ? "Confirm acceptance" : "Confirm rejection"}
//             </Text>
//             <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 6 }}>
//               You can leave an optional note for the employee.
//             </Text>

//             <TextInput
//               value={adminNote}
//               onChangeText={setAdminNote}
//               placeholder="Add a note (optional)"
//               placeholderTextColor={colors.text.secondary}
//               multiline
//               numberOfLines={3}
//               style={{
//                 marginTop: 14,
//                 minHeight: 70,
//                 backgroundColor: colors.base.surfaceL2,
//                 borderColor: colors.base.border,
//                 borderWidth: 1,
//                 borderRadius: 12,
//                 padding: 12,
//                 textAlignVertical: "top",
//                 ...typography.body,
//                 color: colors.text.primary,
//               }}
//             />

//             <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
//               <TouchableOpacity
//                 onPress={() => setModalVisible(false)}
//                 disabled={deciding}
//                 style={{
//                   flex: 1,
//                   height: 46,
//                   borderRadius: 10,
//                   alignItems: "center",
//                   justifyContent: "center",
//                   borderColor: colors.base.border,
//                   borderWidth: 1,
//                 }}
//               >
//                 <Text style={{ ...typography.body, color: colors.text.primary }}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={confirmDecision}
//                 disabled={deciding}
//                 style={{
//                   flex: 1,
//                   height: 46,
//                   borderRadius: 10,
//                   alignItems: "center",
//                   justifyContent: "center",
//                   backgroundColor:
//                     pendingDecision === "accepted" ? colors.status.completed : colors.status.overdue,
//                   opacity: deciding ? 0.7 : 1,
//                 }}
//               >
//                 {deciding ? (
//                   <ActivityIndicator color={colors.base.surfaceL1} />
//                 ) : (
//                   <Text style={{ ...typography.body, color: colors.base.surfaceL1 }}>
//                     {pendingDecision === "accepted" ? "Confirm Accept" : "Confirm Reject"}
//                   </Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }
// Admin's review screen for a single extension request.
// Read-only summary of the request; if still pending, Accept/Reject actions
// appear at the bottom with an optional note, confirmed via a modal.
//
// Realtime-synced: updates live if decided elsewhere. Local state also
// updates immediately on decision so there's no need to leave and return.

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useTheme } from "../../context/ThemeContext";
import { typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

const statusMeta = (colors: any, status: string) => {
  if (status === "accepted")
    return { color: colors.status.completed, icon: "checkmark-circle" as const, label: "Accepted" };
  if (status === "rejected")
    return { color: colors.status.overdue, icon: "close-circle" as const, label: "Rejected" };
  return { color: colors.status.pending, icon: "time" as const, label: "Pending Review" };
};

const priorityMeta = (colors: any, priority?: string) => {
  if (priority === "high") return { color: colors.status.overdue, label: "High Priority" };
  if (priority === "medium") return { color: colors.status.pending, label: "Medium Priority" };
  return { color: colors.status.completed, label: "Low Priority" };
};

export default function AdminRequestReview() {
  const { colors } = useTheme();
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"accepted" | "rejected" | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchRequest = async () => {
    const { data, error } = await supabase
      .from("extension_requests")
      .select("*, tasks(title, priority, assigned_to, deadline)")
      .eq("id", requestId)
      .single();

    if (error) console.error("Error fetching request:", error);
    setRequest(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    fetchRequest();

    const channel = supabase
      .channel(`extension_request_${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "extension_requests", filter: `id=eq.${requestId}` },
        () => { fetchRequest(); }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requestId]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background, alignItems: "center", justifyContent: "center", padding: 30 }}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.text.secondary} />
        <Text style={{ ...typography.body, color: colors.text.primary, marginTop: 12, textAlign: "center" }}>
          Request not found
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.brand.accent, ...typography.body }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const meta = statusMeta(colors, request.status);
  const priority = priorityMeta(colors, request.tasks?.priority);
  const cardShadow = Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    android: { elevation: 4 },
  });

  const openConfirm = (decision: "accepted" | "rejected") => {
    setPendingDecision(decision);
    setAdminNote("");
    setModalVisible(true);
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    setDeciding(true);

    const decidedAt = new Date().toISOString();
    const noteToSave = adminNote.trim() || null;

    const { error } = await supabase
      .from("extension_requests")
      .update({ status: pendingDecision, admin_note: noteToSave, decided_at: decidedAt })
      .eq("id", request.id);

    if (!error && pendingDecision === "accepted") {
      await supabase.from("tasks").update({ deadline: request.requested_deadline }).eq("id", request.task_id);
    }

    setDeciding(false);
    setModalVisible(false);

    if (error) {
      Alert.alert("Could not update", error.message);
      return;
    }

    setRequest((prev: any) => ({ ...prev, status: pendingDecision, admin_note: noteToSave, decided_at: decidedAt }));

    Alert.alert(
      pendingDecision === "accepted" ? "Request accepted" : "Request rejected",
      "The employee will be notified.",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

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
        <Ionicons onPress={() => router.back()} name="arrow-back" size={26} color={colors.brand.onPrimary ?? colors.base.surfaceL1} />
        <Text style={{ ...typography.heading, color: colors.brand.onPrimary ?? colors.base.surfaceL1, marginLeft: 15 }}>
          Review Request
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* ── Status hero ── */}
        <View
          style={{
            backgroundColor: meta.color + "18",
            borderRadius: 20,
            padding: 22,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View
            style={{
              height: 64,
              width: 64,
              borderRadius: 32,
              backgroundColor: meta.color + "26",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Ionicons name={meta.icon} size={34} color={meta.color} />
          </View>
          <Text style={{ ...typography.heading3, color: meta.color }}>{meta.label}</Text>
          {request.decided_at && (
            <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 4 }}>
              Decided on {formatDate(request.decided_at)}
            </Text>
          )}
        </View>

        {/* ── Task card ── */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            marginBottom: 16,
            ...cardShadow,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={{ ...typography.label, color: colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Task
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: priority.color + "22",
                borderRadius: 8,
                paddingHorizontal: 9,
                paddingVertical: 3,
              }}
            >
              <View style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: priority.color }} />
              <Text style={{ ...typography.label, color: priority.color, fontSize: 11 }}>{priority.label}</Text>
            </View>
          </View>
          <Text style={{ ...typography.heading, color: colors.text.primary, marginBottom: 4 }}>
            {request.tasks?.title ?? "Untitled Task"}
          </Text>
          <Text style={{ ...typography.label, color: colors.text.secondary }}>
            Requested by {request.tasks?.assigned_to ?? "—"}
          </Text>
        </View>

        {/* ── Deadline comparison ── */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            marginBottom: 16,
            ...cardShadow,
          }}
        >
          <Text style={{ ...typography.label, color: colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
            Deadline Change
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* Current */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 20,
                  backgroundColor: colors.base.surfaceL2,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
              </View>
              <Text style={{ ...typography.label, color: colors.text.secondary, fontSize: 11, marginBottom: 3 }}>
                CURRENT
              </Text>
              <Text style={{ ...typography.body, color: colors.text.primary }}>
                {formatDate(request.current_deadline)}
              </Text>
            </View>

            {/* Arrow */}
            <Ionicons name="arrow-forward" size={20} color={colors.brand.accent} style={{ marginHorizontal: 8 }} />

            {/* Requested */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  height: 40,
                  width: 40,
                  borderRadius: 20,
                  backgroundColor: colors.brand.accent + "22",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="calendar" size={20} color={colors.brand.accent} />
              </View>
              <Text style={{ ...typography.label, color: colors.brand.accent, fontSize: 11, marginBottom: 3 }}>
                REQUESTED
              </Text>
              <Text style={{ ...typography.body, color: colors.brand.accent, fontFamily: "Poppins-SemiBold" }}>
                {formatDate(request.requested_deadline)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Reason ── */}
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            marginBottom: 16,
            ...cardShadow,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.text.secondary} />
            <Text style={{ ...typography.label, color: colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Employee's Reason
            </Text>
          </View>
          <Text style={{ ...typography.body, color: colors.text.primary, lineHeight: 21 }}>
            {request.reason}
          </Text>
        </View>

        {/* ── Admin note — shown once decided ── */}
        {request.status !== "pending" && (
          <View
            style={{
              backgroundColor: meta.color + "12",
              borderColor: meta.color + "33",
              borderWidth: 1,
              borderRadius: 18,
              padding: 20,
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Ionicons name="create-outline" size={16} color={meta.color} />
              <Text style={{ ...typography.label, color: meta.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Your Note
              </Text>
            </View>
            {request.admin_note ? (
              <Text style={{ ...typography.body, color: colors.text.primary, lineHeight: 21 }}>
                {request.admin_note}
              </Text>
            ) : (
              <Text style={{ ...typography.body, color: colors.text.secondary, fontStyle: "italic" }}>
                No note was left.
              </Text>
            )}
          </View>
        )}

        {/* ── Accept / Reject — only while pending ── */}
        {request.status === "pending" && (
          <View style={{ flexDirection: "row", gap: 14, marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => openConfirm("accepted")}
              style={{
                flex: 1,
                height: 54,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                backgroundColor: colors.status.completed,
                ...cardShadow,
              }}
            >
              <Ionicons name="checkmark" size={20} color={colors.base.surfaceL1} />
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openConfirm("rejected")}
              style={{
                flex: 1,
                height: 54,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                backgroundColor: colors.status.overdue,
                ...cardShadow,
              }}
            >
              <Ionicons name="close" size={20} color={colors.base.surfaceL1} />
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Confirm modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: colors.base.surfaceL1,
              borderRadius: 22,
              padding: 24,
              width: "100%",
              maxWidth: 340,
              ...cardShadow,
            }}
          >
            <View
              style={{
                height: 52,
                width: 52,
                borderRadius: 26,
                backgroundColor:
                  (pendingDecision === "accepted" ? colors.status.completed : colors.status.overdue) + "22",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Ionicons
                name={pendingDecision === "accepted" ? "checkmark" : "close"}
                size={26}
                color={pendingDecision === "accepted" ? colors.status.completed : colors.status.overdue}
              />
            </View>

            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              {pendingDecision === "accepted" ? "Confirm acceptance" : "Confirm rejection"}
            </Text>
            <Text style={{ ...typography.label, color: colors.text.secondary, marginTop: 6 }}>
              You can leave an optional note for the employee.
            </Text>

            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.text.secondary}
              multiline
              numberOfLines={3}
              style={{
                marginTop: 16,
                minHeight: 70,
                backgroundColor: colors.base.surfaceL2,
                borderColor: colors.base.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                textAlignVertical: "top",
                ...typography.body,
                color: colors.text.primary,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={deciding}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: colors.base.border,
                  borderWidth: 1,
                }}
              >
                <Text style={{ ...typography.body, color: colors.text.primary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDecision}
                disabled={deciding}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pendingDecision === "accepted" ? colors.status.completed : colors.status.overdue,
                  opacity: deciding ? 0.7 : 1,
                }}
              >
                {deciding ? (
                  <ActivityIndicator color={colors.base.surfaceL1} />
                ) : (
                  <Text style={{ ...typography.body, color: colors.base.surfaceL1, fontFamily: "Poppins-SemiBold" }}>
                    {pendingDecision === "accepted" ? "Confirm Accept" : "Confirm Reject"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}