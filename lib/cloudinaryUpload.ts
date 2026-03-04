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
//
// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Fix video quality in the Cloudinary dashboard
// ─────────────────────────────────────────────────────────────────────────────
// Go to cloudinary.com → Settings → Upload → Upload Presets → clipt_uploads
// Set these options:
//   - Mode: Unsigned
//   - Unique filename: ON
//   - Delivery type: Upload
//   - Access mode: Public
//   - Transformations: LEAVE EMPTY (no transformations at all)
//   - Format: Keep original format (do NOT convert to mp4 or any other format)
//   - Quality: 100  (NOT "auto" — "auto" applies lossy compression)
//   - Video codec: Copy  (preserves original encoding, no re-encoding)
//   - Audio codec: Copy  (preserves original audio, no re-encoding)
// Save the preset. This stops Cloudinary from compressing or re-encoding uploads.
// ─────────────────────────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration?: number;
  bytes: number;
}

/**
 * Upload a File object or blob URL to Cloudinary with retry logic.
 * @param source     File object or blob:// URL
 * @param onProgress Called with 0–100 as upload bytes are transferred
 * @returns          The permanent public URL (https://res.cloudinary.com/...)
 */
export async function uploadToCloudinary(
  source: File | string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "clipt_unsigned";

  if (!CLOUD_NAME) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not configured");
  }

  // Resolve blob URL → Blob if a string was passed
  let blob: Blob;
  if (typeof source === "string") {
    const response = await fetch(source);
    blob = await response.blob();
  } else {
    blob = source;
  }

  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("resource_type", "video");
  // quality: 100 tells Cloudinary not to apply lossy compression.
  formData.append("quality", "100");
  formData.append("audio_codec", "aac");

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Cloudinary] Upload attempt ${attempt}/${MAX_RETRIES}`);

      const result = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data: CloudinaryUploadResult = JSON.parse(xhr.responseText);
              if (data.secure_url) {
                resolve(data.secure_url);
              } else {
                const msg = (JSON.parse(xhr.responseText) as { error?: { message?: string } })?.error?.message;
                reject(new Error(`Cloudinary error: ${msg || "No URL returned"}`));
              }
            } catch {
              reject(new Error("Failed to parse Cloudinary response"));
            }
          } else {
            reject(new Error(`Cloudinary HTTP ${xhr.status}: ${xhr.responseText.slice(0, 200)}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload — check internet connection"));
        });

        xhr.addEventListener("timeout", () => {
          reject(new Error("Upload timed out — file may be too large"));
        });

        // 10 minute timeout for large video files
        xhr.timeout = 10 * 60 * 1000;
        xhr.open("POST", uploadUrl);
        xhr.send(formData);
      });

      return result;

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[Cloudinary] Upload attempt ${attempt} failed:`, lastError.message);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
  }

  throw new Error(`Upload failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
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
