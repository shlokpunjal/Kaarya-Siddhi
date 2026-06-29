export type Role = 'employee' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  phoneOrEmail: string;
  department?: string;
  managedEmployeeIds?: string[]; // admin-only: which employees report to this admin
}