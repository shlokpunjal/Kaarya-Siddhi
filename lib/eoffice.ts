import { supabase } from './supabase';
import type { EofficeFile } from '../types/eoffice';

export type Employee = {
  id: string;
  name: string;
};

export async function fetchEofficeFiles(): Promise<EofficeFile[]> {
  const { data, error } = await supabase
    .from('e-office')
    .select('*')
    .order('sr_no', { ascending: true });

  if (error) throw error;
  return (data ?? []) as EofficeFile[];
}

export async function fetchEofficeFileById(id: string): Promise<EofficeFile> {
  const { data, error } = await supabase
    .from('e-office')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as EofficeFile;
}

export async function fetchEmployees(workspaceId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name')
    .in('role', ['employee', 'admin'])
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function createEofficeFile(input: {
  file_no: string;
  pending_office: string;
  pending_with: string;
  remark: string;
}): Promise<EofficeFile> {
  const { data: existing, error: srError } = await supabase
    .from('e-office')
    .select('sr_no')
    .order('sr_no', { ascending: false })
    .limit(1);

  if (srError) throw srError;

  const nextSrNo = existing && existing.length > 0 ? existing[0].sr_no + 1 : 1;

  const { data, error } = await supabase
    .from('e-office')
    .insert({
      sr_no: nextSrNo,
      file_no: input.file_no,
      pending_office: input.pending_office,
      pending_with: input.pending_with,
      pending_since: new Date().toISOString(),
      remark: input.remark || null,
      completed: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EofficeFile;
}

export async function updateEofficeFile(
  id: string,
  updates: {
    pending_office?: string;
    pending_with?: string;
    remark?: string | null;
    completed?: boolean;
  }
): Promise<EofficeFile> {
  const payload: Record<string, unknown> = { ...updates };

  if (updates.completed === true) {
    payload.completed_at = new Date().toISOString();
  } else if (updates.completed === false) {
    payload.completed_at = null;
  }

  const { data, error } = await supabase
    .from('e-office')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as EofficeFile;
}