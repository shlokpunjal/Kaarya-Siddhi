import { authFetch } from '../utils/authFetch';
import type { EofficeFile } from '../types/eoffice';

export async function fetchEofficeFiles(): Promise<EofficeFile[]> {
  const res = await authFetch('/eoffice');
  if (!res.ok) throw new Error('Could not load e-office files.');
  return (await res.json()) as EofficeFile[];
}

export async function fetchEofficeFileById(id: string): Promise<EofficeFile> {
  const res = await authFetch(`/eoffice/${id}`);
  if (!res.ok) throw new Error('Could not load file.');
  return (await res.json()) as EofficeFile;
}

export async function createEofficeFile(input: {
  file_no: string;
  pending_office: string;
  pending_with: string | null;
  pending_since: string;
  remark: string | null;
  created_by: string;
}): Promise<EofficeFile> {
  const res = await authFetch('/eoffice', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error('Could not create file.');
  return (await res.json()) as EofficeFile;
}

export async function updateEofficeFile(
  id: string,
  updates: {
    pending_office?: string;
    pending_with?: string | null;
    remark?: string | null;
    completed?: boolean;
  }
): Promise<EofficeFile> {
  const res = await authFetch(`/eoffice/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Could not update file.');
  return (await res.json()) as EofficeFile;
}