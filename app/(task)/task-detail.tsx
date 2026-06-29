// import { mockTasks } from '../../data/mockTasks';
// import { useLocalSearchParams } from "expo-router";
// import { Text, TouchableOpacity, View } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { Ionicons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import { Alert } from "react-native";
// import { lightTheme, typography } from "../../theme/theme";

// const { colors } = lightTheme;

// // Map task status to theme status colors
// const statusColorMap: Record<string, string> = {
//   overdue: colors.status.overdue,
//   pending: colors.status.pending,
//   inReview: colors.status.inReview,
//   completed: colors.status.completed,
// };

// export default function TaskDetail() {
//   const { taskId } = useLocalSearchParams();
//   const task = mockTasks.find((t) => t.id === taskId);

//   if (!task) return <Text style={{ ...typography.body, color: colors.text.primary }}>Task not found</Text>;

//   const statusColor = statusColorMap[task.status] ?? colors.text.secondary;
//   const router = useRouter(); 
//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
//       {/* Header */}
//       <View
//         style={{
//           backgroundColor: colors.brand.primary,
//           height: 60,
//           alignItems: "center",
//           justifyContent: "center",
//         }}
//       >
//         <Text
//           style={{
//             ...typography.heading,
//             color: colors.base.surfaceL1,
//           }}
//         >
//           Task Details
//         </Text>
//       </View>

//       {/* Card */}
//       <View
//         style={{
//           backgroundColor: colors.base.surfaceL1,
//           boxShadow: "0px 0px 5px gray",
//           borderRadius: 20,
//           borderWidth: 1,
//           borderColor: colors.base.border,
//           margin: 40,
//           marginTop: 80,
//           width: 300,
//         }}
//       >
//         {/* Task Title */}
//         <Text
//           style={{
//             ...typography.heading,
//             marginTop: 15,
//             textAlign: "center",
//             color: colors.text.primary,
//           }}
//         >
//           {task.title}
//         </Text>

//         <View>
//           {/* Description */}
//           <View style={{ marginLeft: 20, marginTop: 20 }}>
//             <Text style={{ ...typography.heading3, color: colors.text.primary }}>
//               Description:
//             </Text>
//             <Text style={{ ...typography.body, marginTop: 8, color: colors.text.secondary }}>
//               {task.label}
//             </Text>
//           </View>

//           {/* Status */}
//           <View style={{ marginLeft: 20, marginTop: 25, flexDirection: "row", alignItems: "center", gap: 6 }}>
//             <Text style={{ ...typography.heading3, color: colors.text.primary }}>
//               Status:
//             </Text>
//             <Text style={{ ...typography.heading3, color: statusColor }}>
//               {task.status}
//             </Text>
//           </View>

//           {/* Due Date */}
//           <View style={{ marginLeft: 20, marginTop: 25, flexDirection: "row", alignItems: "center", gap: 6 }}>
//             <Text style={{ ...typography.heading3, color: colors.text.primary }}>
//               Due Date:
//             </Text>
//             <Text style={{ ...typography.heading3, color: statusColor }}>
//               {task.dueDate}
//             </Text>
//           </View>

//           {/* Files Attached */}
//           <Text style={{ ...typography.heading3, marginLeft: 20, marginTop: 25, color: colors.text.primary }}>
//             Files Attached:
//           </Text>

//           <View
//             style={{
//               height: 45,
//               borderWidth: 1,
//               borderColor: colors.base.border,
//               width: 220,
//               margin: 20,
//               borderRadius: 15,
//               backgroundColor: colors.base.surfaceL2,
//               flexDirection: "row",
//               alignItems: "center",
//               gap: 30,
//             }}
//           >
//             <Ionicons
//               style={{ marginLeft: 14 }}
//               name="document"
//               size={24}
//               color={colors.text.secondary}
//             />
//             <Text style={{ ...typography.body, color: colors.text.primary }}>
//               ABC.pdf
//             </Text>
//           </View>

//           {/* Submit Button */}
//           <View style={{ marginBottom: 20 }}>
//             <TouchableOpacity
//               onPress={() => Alert.alert("Success", "Task created successfully!")}
//               style={{
//                 height: 53,
//                 width: 200,
//                 backgroundColor: colors.brand.accent,
//                 borderRadius: 10,
//                 alignItems: "center",
//                 justifyContent: "center",
//                 margin: 30,
//                 marginLeft: 50,
//               }}
//             >
//               <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
//                 Submit Task
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>

//        <Ionicons
//           onPress={() => router.back()}
//           name="arrow-back"
//           size={30}
//           color={colors.base.surfaceL1}
//           style={{
//             margin: 20,
//             marginTop: 120,
//             marginLeft: -5,
//             backgroundColor: colors.brand.primary,
//             borderRadius: 20,
//             width: 40,
//             alignItems: "center",
//             textAlign: "center",
//           }}
//         />
//     </SafeAreaView>
//   );
// }

import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { lightTheme, typography } from "../../theme/theme";
import { supabase } from "../../lib/supabase";

const { colors } = lightTheme;

const statusColorMap: Record<string, string> = {
  overdue:   colors.status.overdue,
  pending:   colors.status.pending,
  in_review:  colors.status.inReview,
  completed: colors.status.completed,
};

export default function TaskDetail() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();

  const [task, setTask]           = useState<any>(null);
  const [taskFiles, setTaskFiles] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch task + its files from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      setLoading(true);

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) {
        console.error("Task fetch error:", taskError);
        setLoading(false);
        return;
      }

      const { data: files, error: filesError } = await supabase
        .from("task_files")
        .select("*")
        .eq("task_id", taskId);

      if (filesError) console.error("Files fetch error:", filesError);

      setTask(taskData);
      setTaskFiles(files ?? []);
      setLoading(false);
    };

    fetchTask();
  }, [taskId]);

  // ── Submit task → inserts into task_submissions + updates status ────────────
  const handleSubmit = async () => {
    if (!task) return;

    try {
      setSubmitting(true);

      const { error: submitError } = await supabase
        .from("task_submissions")
        .insert({
          task_id: task.id,
          submitted_by: task.assigned_to,
          note: "Submitted via app",
        });

      if (submitError) throw submitError;

      // Update task status to inReview
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ status: "inReview" })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Reflect status change locally without refetch
      setTask((prev: any) => ({ ...prev, status: "inReview" }));

      alert("Task submitted successfully!");
      router.back();
    } catch (error: any) {
      alert("Submit failed: " + (error?.message || JSON.stringify(error)));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.base.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.brand.primary} />
        <Text style={{ ...typography.body, color: colors.text.secondary, marginTop: 12 }}>
          Loading task...
        </Text>
      </SafeAreaView>
    );
  }

  // ── Task not found ───────────────────────────────────────────────────────────
  if (!task) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.base.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="alert-circle-outline" size={48} color={colors.status.overdue} />
        <Text style={{ ...typography.body, color: colors.text.primary, marginTop: 12 }}>
          Task not found.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.brand.primary, ...typography.body }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusColor = statusColorMap[task.status] ?? colors.text.secondary;

  // ── UI ───────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.brand.primary,
          height: 70,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <Ionicons
          onPress={() => router.back()}
          name="arrow-back"
          size={28}
          color={colors.base.surfaceL1}
        />
        <Text
          style={{
            ...typography.heading,
            color: colors.base.surfaceL1,
            flex: 1,
            textAlign: "center",
            marginRight: 28,
          }}
        >
          Task Details
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.base.surfaceL1,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.base.border,
            padding: 20,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.12,
                shadowRadius: 6,
              },
              android: { elevation: 5 },
            }),
          }}
        >
          {/* Task Title */}
          <Text
            style={{
              ...typography.heading,
              color: colors.text.primary,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {task.title}
          </Text>

          {/* Status */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Ionicons
              name="ellipse"
              size={12}
              color={statusColor}
              style={{ marginRight: 8 }}
            />
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>Status: </Text>
            <Text
              style={{
                ...typography.heading3,
                color: statusColor,
                textTransform: "capitalize",
              }}
            >
              {task.status ?? "pending"}
            </Text>
          </View>

          {/* Divider */}
          <View
            style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }}
          />

          {/* Description */}
          <Text style={{ ...typography.heading3, color: colors.text.primary, marginBottom: 6 }}>
            Description
          </Text>
          <Text
            style={{ ...typography.body, color: colors.text.secondary, marginBottom: 20 }}
          >
            {task.description ?? "No description provided."}
          </Text>

          {/* Deadline */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={colors.text.secondary}
              style={{ marginRight: 8 }}
            />
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              Deadline:{" "}
            </Text>
            <Text style={{ ...typography.body, color: statusColor }}>
              {task.deadline
                ? new Date(task.deadline).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "No deadline set"}
            </Text>
          </View>

          {/* Assigned To */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Ionicons
              name="person-outline"
              size={18}
              color={colors.text.secondary}
              style={{ marginRight: 8 }}
            />
            <Text style={{ ...typography.heading3, color: colors.text.primary }}>
              Assigned To:{" "}
            </Text>
            <Text
              numberOfLines={1}
              style={{ ...typography.body, color: colors.text.secondary, flex: 1 }}
            >
              {task.assigned_to ?? "—"}
            </Text>
          </View>

          {/* Divider */}
          <View
            style={{ height: 1, backgroundColor: colors.base.border, marginBottom: 16 }}
          />

          {/* Files Attached — fetched from task_files table (Cloudinary URLs) */}
          <Text
            style={{
              ...typography.heading3,
              color: colors.text.primary,
              marginBottom: 10,
            }}
          >
            Files Attached ({taskFiles.length})
          </Text>

          {taskFiles.length === 0 ? (
            <Text
              style={{
                ...typography.body,
                color: colors.text.secondary,
                marginBottom: 16,
              }}
            >
<<<<<<< HEAD
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
                Submit Task
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity
              // onPress={() => Alert.alert("Success", "Task created successfully!")}
              style={{
                height: 53,
                width: 200,
                backgroundColor: "#0B1B3D",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                margin: 30,
                marginLeft: 50,
                marginTop:-25
              }}
            >
              <Text style={{ ...typography.subheading, color: colors.base.surfaceL1 }}>
                Extend Deadline
              </Text>
            </TouchableOpacity>
          </View>


        </View>
      </View>
=======
              No files attached.
            </Text>
          ) : (
            taskFiles.map((file, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => file.file_url && Linking.openURL(file.file_url)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.base.surfaceL2,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.base.border,
                  padding: 12,
                  marginBottom: 8,
                  gap: 10,
                }}
              >
                <Ionicons name="document" size={22} color={colors.brand.primary} />
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, ...typography.body, color: colors.text.primary }}
                >
                  {file.file_name ?? "Unnamed file"}
                </Text>
                <Ionicons name="open-outline" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            ))
          )}
>>>>>>> 4ac8f2c (Supabase file uploaded..)

          {/* Submit Task Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || task.status === "completed" || task.status === "in_review"}
            style={{
              backgroundColor:
                task.status === "completed" || task.status === "inReview"
                  ? colors.base.border
                  : colors.brand.primary,
              height: 50,
              borderRadius: 12,
              justifyContent: "center",
              alignItems: "center",
              marginTop: 24,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.base.surfaceL1} />
            ) : (
              <Text
                style={{
                  color: colors.base.surfaceL1,
                  fontWeight: "bold",
                  ...typography.body,
                }}
              >
                {task.status === "completed"
                  ? "Already Completed"
                  : task.status === "inReview"
                  ? "Under Review"
                  : "Submit Task"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
