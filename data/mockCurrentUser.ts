import { User } from '../types/user';

export const mockEmployeeUser: User = {
  id: 'emp1',
  name: 'Ravi Kumar',
  role: 'employee',
  phoneOrEmail: 'ravi.kumar@centralrailway.gov.in',
  department: 'Construction',
};

export const mockAdminUser: User = {
  id: 'admin1',
  name: 'Suresh Patil',
  role: 'admin',
  phoneOrEmail: 'suresh.patil@centralrailway.gov.in',
  department: 'Construction',
  managedEmployeeIds: ['emp1', 'emp2'],
};