import { useState, useCallback } from "react";
import { authFetch } from "../../utils/authFetch";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  mobile_number: string | null;
  department: string | null;
  designation: string | null;
  profile_pic_url: string | null;
};

// Fetches the logged-in user's own row via the verified /me endpoint.
// Derives identity strictly from the Bearer token via authFetch, not from
// any cached email in AsyncStorage.
export function useCurrentUser(onError?: (msg: string) => void) {
  const [currentUser, setCurrentUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/me");
      if (!res.ok) {
        onError?.("Could not load your profile. Please try again.");
        return null;
      }
      const data: UserRow = await res.json();
      setCurrentUser(data);
      return data;
    } catch (error: any) {
      console.error("Profile fetch error:", error?.message ?? error);
      onError?.("Could not load your profile. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [onError]);

  return { currentUser, setCurrentUser, loading, fetchCurrentUser };
}