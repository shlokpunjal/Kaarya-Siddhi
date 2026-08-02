import { useEffect, useState } from "react";
import { authFetch } from "../../utils/authFetch";

/**
 * Was hand-rolled identically in admin.tsx and admin-requests-list.tsx
 * (employee.tsx used a trimmed-down version that only kept the id).
 * `resolved` flips to true once the /me call settles (success or failure)
 * so callers can gate their own loading state the way
 * admin-requests-list.tsx did (`setLoading(false)` on a failed /me).
 */
export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await authFetch("/me");
      if (res.ok) {
        const data = await res.json();
        setUserId(data.id);
        setWorkspaceId(data.workspace_id ?? null);
      }
      setResolved(true);
    })();
  }, []);

  return { userId, workspaceId, resolved };
}