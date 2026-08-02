import { useState } from "react";
import { authFetch } from "../../utils/authFetch";
import { useToast } from "../../context/ToastContext";

/**
 * Shared "mark this task complete" flow: opens a confirm modal, PATCHes
 * { status: "completed" }, and toasts the result. `onCompleted` gets a
 * chance to update local task state (e.g. setTask(prev => ({...prev,
 * status: "completed"}))) — it's called before the modal closes.
 */
export function useTaskComplete(
  taskId: string | undefined,
  onCompleted: () => void,
) {
  const [completing, setCompleting] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const { showToast } = useToast();

  const requestComplete = () => setConfirmVisible(true);
  const cancelComplete = () => setConfirmVisible(false);

  const confirmComplete = async () => {
    if (!taskId) return;

    try {
      setCompleting(true);
      const res = await authFetch(`/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) throw new Error("Failed to mark complete");

      onCompleted();
      setConfirmVisible(false);
      showToast("Task marked as completed!", "success");
    } catch (error: any) {
      setConfirmVisible(false);
      showToast(error?.message || "Failed to mark complete", "error");
    } finally {
      setCompleting(false);
    }
  };

  return { completing, confirmVisible, requestComplete, cancelComplete, confirmComplete };
}