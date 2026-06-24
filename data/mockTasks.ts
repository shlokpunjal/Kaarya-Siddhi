import { Task } from '../types/task';

export const mockTasks: Task[] = [
  { id: '1', title: 'Some Task', status: 'overdue', priority: 'high', label: 'Maintenance', assignedTo: 'emp1', createdBy: 'admin1', dueDate: '2026-06-18' },
  { id: '2', title: 'Bridge Inspection Report', status: 'overdue', priority: 'high', label: 'Inspection', assignedTo: 'emp1', createdBy: 'admin1', dueDate: '2026-06-19' },
  { id: '3', title: 'Site Survey - Block 4', status: 'pending', priority: 'medium', label: 'Survey', assignedTo: 'emp1', createdBy: 'admin1', dueDate: '2026-06-25' },
  { id: '4', title: 'Material Stock Update', status: 'pending', priority: 'low', label: 'documentation', assignedTo: 'emp2', createdBy: 'admin1', dueDate: '2026-06-26' },
  { id: '5', title: 'Track Maintenance Log', status: 'pending', priority: 'medium', label: 'Maintenance', assignedTo: 'emp2', createdBy: 'admin1', dueDate: '2026-06-27' },
  { id: '6', title: 'Safety Audit Checklist', status: 'inReview', priority: 'high', label: 'Inspection', assignedTo: 'emp1', createdBy: 'admin1', dueDate: '2026-06-22' },
  { id: '7', title: 'Drainage Plan Review', status: 'inReview', priority: 'medium', label: 'Survey', assignedTo: 'emp2', createdBy: 'admin1', dueDate: '2026-06-23' },
];