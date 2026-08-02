// app/(admin)/calendar.tsx
import CalendarView from "../../components/calendar/CalendarView";

export default function CalendarScreen() {
  return (
    <CalendarView
      taskDetailRoute="/(task)/task-detail-admin"
      buildChannels={(currentUser: { workspace_id: string; }) => {
        const workspaceId = currentUser.workspace_id as string;
        return [
          { name: "admin-calendar-tasks", table: "tasks", filter: `workspace_id=eq.${workspaceId}` },
          { name: "admin-calendar-extension-requests", table: "extension_requests", filter: `workspace_id=eq.${workspaceId}` },
        ];
      }}
    />
  );
}