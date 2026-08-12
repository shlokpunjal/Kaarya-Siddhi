import { View } from "react-native";
import TaskDashboard from "../../components/dashboard/TaskDashboard";
import { ChatFab } from "../../components/chat/ChatFab";

export default function AdminDashboard() {
  return (
    <View style={{ flex: 1 }}>
      <TaskDashboard
        role="admin"
        newTaskRoute="/new-task"
        notificationsRoute="/notifications/admin"
        taskDetailRoute="/(task)/task-detail-admin"
        emptyIllustration={require("../../assets/images/notaskImage.png")}
      />
      <ChatFab />
    </View>
  );
}