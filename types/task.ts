export type TaskStatus = 'overdue' | 'pending' | 'inReview' | 'completed';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignedTo: string; // employee id
  createdBy: string;  // admin id
  dueDate: string;
  suggestion?: string; // admin feedback, set only by admin
}