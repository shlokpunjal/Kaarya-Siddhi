import { supabase } from './supabase';
import type { EofficeFile } from '../types/eoffice';

export async function fetchEofficeFiles(): Promise<EofficeFile[]> {
  const { data, error } = await supabase
    .from('e-office')
    .select('*')
    .order('sr_no', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EofficeFile[];
}