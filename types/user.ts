export type Role = 'employee' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  phoneOrEmail: string;
}