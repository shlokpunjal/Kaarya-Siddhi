export type TaskStatus = 'overdue' | 'pending' | 'inReview' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

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