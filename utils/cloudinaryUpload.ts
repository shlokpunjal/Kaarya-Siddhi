import { authFetch } from "./authFetch";

type SignatureResponse = {
  signature: string;
  timestamp: number;
  api_key: string;
  cloud_name: string;
  folder?: string | null;
};

async function getCloudinarySignature(folder?: string): Promise<SignatureResponse> {
  const query = folder ? `?folder=${encodeURIComponent(folder)}` : "";
  const res = await authFetch(`/cloudinary/signature${query}`, { method: "GET" });

  if (!res.ok) {
    // Surface the backend's actual reason (e.g. "Invalid folder." or
    // "Cloudinary is not configured on the server.") instead of a
    // generic message — makes this failure mode diagnosable instead of
    // a dead end.
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detail || "";
    } catch {
      // response wasn't JSON — ignore, fall through to generic message
    }
    throw new Error(
      detail
        ? `Could not authorize the upload: ${detail} (status ${res.status})`
        : `Could not authorize the upload. Please try again. (status ${res.status})`,
    );
  }
  return res.json();
}

type UploadableFile = {
  uri: string;
  name: string;
  type?: string;
};

type UploadOptions = {
  folder?: string;
  resourceType?: "image" | "auto" | "video" | "raw";
};

export async function uploadToCloudinary(
  file: UploadableFile,
  options: UploadOptions = {},
): Promise<string> {
  const { folder, resourceType = "auto" } = options;

  const sig = await getCloudinarySignature(folder);

  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type || "application/octet-stream",
  } as any);
  formData.append("api_key", sig.api_key);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  if (sig.folder) {
    formData.append("folder", sig.folder);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloud_name}/${resourceType}/upload`,
    { method: "POST", body: formData },
  );
  const data = await response.json();

  if (!data.secure_url) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return data.secure_url as string;
}