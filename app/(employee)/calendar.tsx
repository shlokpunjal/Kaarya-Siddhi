// app/(employee)/calendar.tsx
import CalendarView from "../../components/calendar/CalendarView";

export default function CalendarScreen() {
  return (
    <CalendarView
      taskDetailRoute="/(task)/task-detail"
      buildChannels={(currentUser) => {
        const userId = currentUser.id as string;
        return [
          { name: "employee-calendar-tasks-assigned", table: "tasks", filter: `assigned_to=eq.${userId}` },
          { name: "employee-calendar-tasks-created", table: "tasks", filter: `created_by=eq.${userId}` },
          { name: "employee-calendar-extension-requests", table: "extension_requests", filter: `requested_by=eq.${userId}` },
        ];
      }}
    />
  );
}