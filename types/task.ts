export type TaskStatus = 'overdue' | 'pending' | 'inReview' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type ExtensionStatus = 'pending' | 'accepted' | 'rejected';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  label: string;
  assignedTo: string; // employee id
  createdBy: string;  // admin id
  dueDate: string;
  suggestion?: string; // admin feedback, set only by admin
}

// One employee request to push a task's deadline back.
// Only ONE non-final (pending) request is allowed per task at a time —
// enforce that in createExtensionRequest, not in the UI alone.
export interface ExtensionRequest {
  id: string;
  taskId: string;
  taskTitle: string;     // denormalized for easy display in notification list
  assignedTo: string;    // employee id
  priority: TaskPriority;
  currentDeadline: string;
  requestedDeadline: string;
  reason: string;
  status: ExtensionStatus;
  adminNote?: string;    // optional note left by admin on accept/reject
  createdAt: string;     // ISO timestamp
  decidedAt?: string;
}
