import TaskDashboard from "../../components/dashboard/TaskDashboard";

export default function AdminDashboard() {
  return (
    <TaskDashboard
      role="admin"
      newTaskRoute="/newtask"
      notificationsRoute="/notifications/admin"
      taskDetailRoute="/(task)/taskDetailAdmin"
      emptyIllustration={require("../../assets/images/notaskImage.png")}
    />
  );
}