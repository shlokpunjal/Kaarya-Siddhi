import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";
import { useToast } from "../../context/ToastContext";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB — adjust to your use case
const MAX_FILE_COUNT = 10; // total files that can be attached at once

export type UploadedFile = {
  file_url: string;
  file_name: string;
  file_type: string;
};

/**
 * Picking, deduping, removing, and uploading task attachments.
 * `uploadAll()` returns the Cloudinary results for whatever's currently
 * attached — the caller decides what to do with them (attach to a task,
 * take the first as the "main" attachment_url, etc).
 */
export function useFileAttachments() {
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const { showToast } = useToast();

  const pickFile = async (onOversized?: (files: any[]) => void) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;

    const oversized = result.assets.filter(
      (f) => (f.size ?? 0) > MAX_FILE_SIZE,
    );
    if (oversized.length) {
      onOversized?.(oversized);
      return;
    }

    setAttachedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = result.assets.filter((f) => !existingNames.has(f.name));

      // Cap the total number of attached files at MAX_FILE_COUNT. Only take
      // as many of the newly picked files as there's room for, and let the
      // user know some were skipped.
      const remainingSlots = MAX_FILE_COUNT - prev.length;
      if (remainingSlots <= 0) {
        showToast(`You can attach up to ${MAX_FILE_COUNT} files.`, "error");
        return prev;
      }
      if (newFiles.length > remainingSlots) {
        showToast(`Only ${MAX_FILE_COUNT} files can be attached — added the first ${remainingSlots}.`, "error");
      }

      return [...prev, ...newFiles.slice(0, remainingSlots)];
    });
  };

  const removeFile = (name: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const uploadOne = async (file: any): Promise<UploadedFile> => {
    const secureUrl = await uploadToCloudinary(
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      },
      { folder: "task_attachments", resourceType: "auto" },
    );
    return {
      file_url: secureUrl,
      file_name: file.name,
      file_type: file.name.split(".").pop()?.toLowerCase() ?? "file",
    };
  };

  const uploadAll = () => Promise.all(attachedFiles.map(uploadOne));

  return { attachedFiles, pickFile, removeFile, uploadAll };
}