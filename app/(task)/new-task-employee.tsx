import {
  View,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableOpacity,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { typography } from "../../theme/theme";
import { useTheme } from "../../context/ThemeContext";
import { wp, hp, moderateScale } from "../../utils/responsive";
import { AlertModal } from "../../components/common/AlertModal";
import TaskFormSkeleton from "../../components/skeletonScreens/Tasks/TaskFormSkeleton";
import { ScreenHeader } from "../../components/task/ScreenHeader";
import { PrioritySelector } from "../../components/task/PrioritySelector";
import { DeadlinePicker } from "../../components/task/DeadlinePicker";
import { FileAttachmentPicker } from "../../components/task/FileAttachmentPicker";
import { useTaskForm } from "../../hooks/task/useTaskForm";

// Employee's own create/edit screen — self-assigned task, no employee
// picker. Mirrors newtask.tsx (the admin's assign-to-employee version)
// exactly except for that one field; both share useTaskForm underneath.
export default function NewTaskEmployee() {
  const { colors } = useTheme();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();

  const form = useTaskForm(taskId, "self");
  const {
    isEditMode,
    fetchingTask,
    loading,
    taskName,
    setTaskName,
    description,
    setDescription,
    deadlineDate,
    setDeadlineDate,
    showDatePicker,
    setShowDatePicker,
    onChangeDate,
    selectedPriority,
    setSelectedPriority,
    fileAttachments,
    submit,
    taskDelete,
  } = form;

  const inputStyle = {
    backgroundColor: colors.base.surfaceL2,
    marginTop: 14,
    height: moderateScale(50),
    borderRadius: 12,
    borderColor: colors.base.border,
    borderWidth: 1,
    paddingLeft: 15,
    color: colors.text.primary,
    ...typography.body,
  };

  if (fetchingTask) {
    return <TaskFormSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.base.background }}>
      <ScreenHeader
        title={isEditMode ? "Edit Task" : "New Task"}
        rightIcon={isEditMode ? "trash-outline" : undefined}
        onRightPress={taskDelete.requestDelete}
        rightDisabled={taskDelete.deleting || loading}
        rightLoading={taskDelete.deleting}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? moderateScale(70) : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: wp(6.4), paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View
            style={{
              backgroundColor: colors.base.surfaceL1,
              borderRadius: 16,
              marginTop: hp(3.7),
              borderWidth: 1,
              borderColor: colors.base.border,
              padding: wp(5.3),
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
            <TextInput
              placeholder="Task Name"
              placeholderTextColor={colors.text.secondary}
              value={taskName}
              onChangeText={setTaskName}
              style={inputStyle}
            />

            {/* No employee autocomplete here — this screen only ever
                handles the employee's own self-created tasks. */}

            <DeadlinePicker
              date={deadlineDate}
              onChangeDate={onChangeDate}
              onClear={() => setDeadlineDate(null)}
              showPicker={showDatePicker}
              onOpen={() => setShowDatePicker(true)}
            />

            <View style={{ marginTop: 14 }}>
              <Text
                style={{
                  ...typography.body,
                  color: colors.text.secondary,
                  marginBottom: 8,
                  paddingLeft: 4,
                }}
              >
                Priority
              </Text>
              <PrioritySelector
                value={selectedPriority}
                onChange={setSelectedPriority}
              />
            </View>

            <TextInput
              placeholder="Add Description"
              placeholderTextColor={colors.text.secondary}
              value={description}
              onChangeText={setDescription}
              multiline
              style={[
                inputStyle,
                { marginTop: 14, height: moderateScale(100), paddingTop: 12 },
              ]}
            />

            <FileAttachmentPicker
              files={fileAttachments.attachedFiles}
              onPick={() => fileAttachments.pickFile()}
              onRemove={fileAttachments.removeFile}
            />

            <TouchableOpacity
              onPress={submit}
              disabled={loading || taskDelete.deleting}
              style={{
                backgroundColor: loading
                  ? colors.base.border
                  : colors.brand.accent,
                height: moderateScale(54),
                borderRadius: 14,
                marginTop: 24,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.base.surfaceL1} />
              ) : (
                <Text
                  style={{
                    ...typography.subheading,
                    color: colors.base.surfaceL1,
                    fontSize: moderateScale(18),
                  }}
                >
                  {isEditMode ? "Save Changes" : "Add task"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertModal
        visible={taskDelete.confirmVisible}
        type="warning"
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText={taskDelete.deleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={taskDelete.confirmDelete}
        onCancel={taskDelete.cancelDelete}
      />
    </SafeAreaView>
  );
}