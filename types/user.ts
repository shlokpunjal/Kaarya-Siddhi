export type Role = 'employee' | 'admin';

export interface User {
  id: string;
  name: string;
  designation:string,
  role: Role;
  email: string;
  phone:string;
  department?: string;
  managedEmployeeIds?: string[]; // admin-only: which employees report to this admin
}