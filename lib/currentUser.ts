import { authFetch } from '../utils/authFetch';

export type CurrentUser = {
  id: string;
  role: string;
  email: string;
  workspace_id: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const res = await authFetch('/me');

  if (!res.ok) {
    console.error('Could not resolve current user:', res.status);
    return null;
  }

  const data = await res.json();
  return { id: data.id, role: data.role, email: data.email, workspace_id: data.workspace_id };
}