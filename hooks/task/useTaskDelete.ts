import { useState } from "react";
import { authFetch } from "../../utils/authFetch";
import { useToast } from "../../context/ToastContext";

/**
 * Shared "delete this task" flow: opens a confirm modal, calls
 * DELETE /tasks/:id, toasts the result, and runs onDeleted() after a
 * short delay so the success toast is visible before navigating away.
 *
 * Pass `guard` if the caller needs a defense-in-depth ownership check
 * right before the request fires (e.g. "employees may only delete
 * tasks they created"). Return `true` to proceed, or a string to show
 * as the error toast and abort.
 */
export function useTaskDelete(
  taskId: string | undefined,
  onDeleted: () => void,
  guard?: () => true | string,
) {
  const [deleting, setDeleting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const { showToast } = useToast();

  const requestDelete = () => setConfirmVisible(true);
  const cancelDelete = () => setConfirmVisible(false);

  const confirmDelete = async () => {
    if (!taskId) return;

    if (guard) {
      const result = guard();
      if (result !== true) {
        setConfirmVisible(false);
        showToast(result, "error");
        return;
      }
    }

    try {
      setDeleting(true);
      const res = await authFetch(`/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      setConfirmVisible(false);
      showToast("Task has been deleted.", "success");
      setTimeout(onDeleted, 900);
    } catch (error: any) {
      setConfirmVisible(false);
      showToast(error?.message || "Delete failed", "error");
    } finally {
      setDeleting(false);
    }
  };

  return { deleting, confirmVisible, requestDelete, cancelDelete, confirmDelete };
}