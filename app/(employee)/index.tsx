import TaskDashboard from "../../components/dashboard/TaskDashboard";

export default function EmployeeDashboard() {
  return (
    <TaskDashboard
      role="employee"
      newTaskRoute="(task)/new-task-employee"
      notificationsRoute="/notifications/employee"
      taskDetailRoute="/(task)/task-detail-employee"
      emptyIllustration={require("../../assets/images/image.png")}
    />
  );
}