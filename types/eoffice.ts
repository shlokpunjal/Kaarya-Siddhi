export type EofficeFile = {
  id: string;
  sr_no: number;
  file_no: string;
  pending_office: string;
<<<<<<< HEAD
  pending_with: string | null;
=======
  pending_with: string | null; // employee user id
  pending_with_name: string | null; // resolved display name from backend
>>>>>>> 628a6d3e52a4bd4a724aeac4969ed7da631e3ba9
  pending_since: string;
  remark: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  created_by: string;
<<<<<<< HEAD
=======
  workspace_id: string;
>>>>>>> 628a6d3e52a4bd4a724aeac4969ed7da631e3ba9
};