export type EofficeFile = {
  id: string;
  sr_no: number;
  file_no: string;
  pending_office: string;
  pending_with: string;
  pending_since: string; // ISO timestamp, drives the days-pending calc
  remark: string | null;
  completed: boolean;
  created_at: string;
};