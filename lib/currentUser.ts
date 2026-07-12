import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type CurrentUser = {
  id: string;
  role: string;
  email: string;
  workspace_id: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const email = await AsyncStorage.getItem('userEmail');
  const role = await AsyncStorage.getItem('userRole');

  if (!email || !role) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, workspace_id')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.error('Could not resolve current user id:', error?.message);
    return null;
  }

  return { id: data.id, role, email, workspace_id: data.workspace_id };
}