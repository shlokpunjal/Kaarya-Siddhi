import TaskDashboard from "../../components/dashboard/TaskDashboard";

export default function AdminDashboard() {
  return (
    <TaskDashboard
      role="admin"
      newTaskRoute="/new-task"
      notificationsRoute="/notifications/admin"
      taskDetailRoute="/(task)/task-detail-admin"
      emptyIllustration={require("../../assets/images/notaskImage.png")}
    />
  );
}