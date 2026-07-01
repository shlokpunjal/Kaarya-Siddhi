// data/mockExtensionRequests.ts
//
// In-memory mock store for extension requests, mirroring how mockTasks.ts
// is used elsewhere. Replace the array + helper functions with real
// backend/database calls when ready — keep the function signatures the
// same so the UI doesn't need to change.

import { ExtensionRequest } from "../types/task";

export let mockExtensionRequests: ExtensionRequest[] = [
  {
    id: "ext-1",
    taskId: "1",
    taskTitle: "Submit Q2 Report",
    assignedTo: "emp-1",
    currentDeadline: "2026-07-02",
    requestedDeadline: "2026-07-08",
    reason: "Waiting on data from finance team, expected by Friday.",
    status: "pending",
    priority: "high",
    createdAt: "2026-06-29T10:00:00.000Z",
  },
];

// Is there already an open (pending) request for this task?
export function hasPendingRequest(taskId: string): boolean {
  return mockExtensionRequests.some(
    (r) => r.taskId === taskId && r.status === "pending"
  );
}

export function getRequestByTaskId(taskId: string): ExtensionRequest | undefined {
  return mockExtensionRequests.find((r) => r.taskId === taskId);
}

export function getRequestById(id: string): ExtensionRequest | undefined {
  return mockExtensionRequests.find((r) => r.id === id);
}

export function createExtensionRequest(
  input: Omit<ExtensionRequest, "id" | "status" | "createdAt">
): ExtensionRequest {
  if (hasPendingRequest(input.taskId)) {
    throw new Error("A pending extension request already exists for this task.");
  }
  const newRequest: ExtensionRequest = {
    ...input,
    id: `ext-${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  mockExtensionRequests = [newRequest, ...mockExtensionRequests];
  return newRequest;
}

export function decideExtensionRequest(
  id: string,
  status: "accepted" | "rejected",
  adminNote?: string
): void {
  mockExtensionRequests = mockExtensionRequests.map((r) =>
    r.id === id
      ? { ...r, status, adminNote, decidedAt: new Date().toISOString() }
      : r
  );
}

export function getPendingCount(): number {
  return mockExtensionRequests.filter((r) => r.status === "pending").length;
}
