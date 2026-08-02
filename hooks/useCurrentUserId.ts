import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";

/**
 * Resolves the logged-in user's id via /me.
 * Used to decide task ownership (edit/delete/complete visibility) on
 * both the employee and admin task-detail screens.
 */
export function useCurrentUserId() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveUser = async () => {
      const res = await authFetch("/me");
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setCurrentUserId(data.id);
      }
    };

    resolveUser();
    return () => {
      cancelled = true;
    };
  }, []);

  return currentUserId;
}