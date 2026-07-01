import { User } from '../types/user';

export const mockEmployeeUser: User = {
  id: 'emp1',
  name: 'Ravi Kumar',
  designation:'Manager',
  role: 'employee',
  email: 'ravi.kumar@centralrailway.gov.in',
  phone:'123456789',
  department: 'Construction',
};

export const mockAdminUser: User = {
  id: 'admin1',
  name: 'Suresh Patil',
  designation:'Deputy Chief Executive',
  role: 'admin',
  email: 'suresh.patil@centralrailway.gov.in',
  phone:'0987654321',
  department: 'Construction',
  managedEmployeeIds: ['emp1', 'emp2'],
};