// ── Cloudinary browser upload utility ────────────────────────────────────────
// Client-side only — do NOT import in server components or API routes.
//
// Required env vars:
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME     — your Cloudinary cloud name
//   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET  — an unsigned upload preset
//
// To create an unsigned preset:
//   Cloudinary dashboard → Settings → Upload → Upload presets → Add preset
//   Set Signing mode to "Unsigned" and save the preset name.
//
// Cloudinary free plan supports 25GB storage and 25GB bandwidth/month.
// Large video files (>100MB) require a paid plan.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "clipt_unsigned";

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  bytes: number;
}

/**
 * Upload a File object or blob URL to Cloudinary.
 * @param source     File object or blob:// URL
 * @param onProgress Called with 0–100 as upload bytes are transferred
 * @returns          The permanent public URL (https://res.cloudinary.com/...)
 */
export async function uploadToCloudinary(
  source: File | string,
  onProgress?: (pct: number) => void
): Promise<string> {
  if (!CLOUD_NAME) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured");
  }

  let blob: Blob;
  if (typeof source === "string") {
    // Fetch blob URL → Blob
    const response = await fetch(source);
    blob = await response.blob();
  } else {
    blob = source;
  }

  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("resource_type", "video");
  // Preserve original quality — disable Cloudinary's lossy compression
  formData.append("quality", "100");
  formData.append("video_codec", "auto");
  formData.append("audio_codec", "aac");

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result: CloudinaryUploadResult = JSON.parse(xhr.responseText);
          resolve(result.secure_url);
        } catch {
          reject(new Error("Cloudinary upload response parse failed"));
        }
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status} ${xhr.responseText.slice(0, 200)}`));
      }
    };

    xhr.onerror = () => reject(new Error("Cloudinary upload network error"));
    xhr.ontimeout = () => reject(new Error("Cloudinary upload timed out"));

    // 10 minute timeout for large video files
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(formData);
  });
}

/**
 * Upload multiple clips to Cloudinary with combined progress tracking.
 * Clips are uploaded sequentially to avoid overwhelming the connection.
 * @param sources    Array of File objects or blob URLs
 * @param onProgress Called with 0–100 representing overall progress
 * @returns          Array of public Cloudinary URLs in the same order
 */
export async function uploadClipsToCloudinary(
  sources: Array<File | string>,
  onProgress?: (pct: number, label: string) => void
): Promise<string[]> {
  const urls: string[] = [];
  const total = sources.length;

  for (let i = 0; i < total; i++) {
    onProgress?.(Math.round((i / total) * 100), `Uploading clip ${i + 1} of ${total}...`);

    const url = await uploadToCloudinary(sources[i], (filePct) => {
      const overall = Math.round(((i + filePct / 100) / total) * 100);
      onProgress?.(overall, `Uploading clip ${i + 1} of ${total}... (${filePct}%)`);
    });

    urls.push(url);
  }

  onProgress?.(100, "Upload complete");
  return urls;
}
