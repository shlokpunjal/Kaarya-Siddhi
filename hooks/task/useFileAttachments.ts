import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB — adjust to your use case

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
      return [...prev, ...newFiles];
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