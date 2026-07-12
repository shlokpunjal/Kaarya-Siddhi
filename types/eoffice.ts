export type EofficeFile = {
  id: string;
  sr_no: number;
  file_no: string;
  pending_office: string;
  pending_with: string;
  pending_since: string;
  remark: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};