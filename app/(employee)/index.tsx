import { View } from "react-native";
import TaskDashboard from "../../components/dashboard/TaskDashboard";
import { ChatFab } from "../../components/chat/ChatFab";

export default function EmployeeDashboard() {
  return (
    <View style={{ flex: 1 }}>
      <TaskDashboard
        role="employee"
        newTaskRoute="(task)/new-task-employee"
        notificationsRoute="/notifications/employee"
        taskDetailRoute="/(task)/task-detail-employee"
        emptyIllustration={require("../../assets/images/notaskImage.png")}
      />
      <ChatFab />
    </View>
  );
}