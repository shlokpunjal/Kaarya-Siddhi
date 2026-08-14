import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/**
 * Downloads a file from a public URL (Cloudinary, etc.) into the app's
 * cache directory, then opens the OS share/save sheet so the user can
 * save it to their device, send it elsewhere, and so on.
 *
 * Shared by every "download" action on task attachments and
 * submissions — admin's attached files, and employee's submitted files.
 */
export async function downloadAndShareFile(url: string, fileName?: string | null): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not download the file.");
  }
  const blob = await response.blob();

  const base64Data: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const safeName = fileName || url.split("/").pop() || "download";
  const file = new File(Paths.cache, safeName);
  await file.write(base64Data, { encoding: "base64" });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, { dialogTitle: safeName });
  } else {
    throw new Error("Sharing isn't available on this device.");
  }
}

