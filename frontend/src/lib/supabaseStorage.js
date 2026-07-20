/**
 * Supabase Storage helpers for entry images & audio paths.
 */
import { getSupabase } from "@/lib/supabase";

const IMAGE_BUCKET = "entry-images";
const AUDIO_BUCKET = "entry-audio";

export function isStoragePath(url) {
  if (!url) return false;
  return url.startsWith("sb://") || (!url.startsWith("http") && !url.startsWith("/api/"));
}

export function storagePath(bucket, entryId, filename) {
  return `${bucket}/${entryId}/${filename}`;
}

export function toSbUrl(bucket, path) {
  return `sb://${bucket}/${path.replace(`${bucket}/`, "")}`;
}

export async function getSignedUrl(bucket, path, expiresIn = 3600) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}

/** Resolve image_url from DB into a browser-loadable URL. */
export async function resolveStorageImageUrl(imageUrl, entryId) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("/api/")) {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    return `${base}${imageUrl}`;
  }

  const supabase = getSupabase();
  if (!supabase) return imageUrl;

  let bucket = IMAGE_BUCKET;
  let path = imageUrl;
  if (imageUrl.startsWith("sb://")) {
    const rest = imageUrl.slice(5);
    const slash = rest.indexOf("/");
    bucket = rest.slice(0, slash);
    path = rest.slice(slash + 1);
  } else if (imageUrl.includes("/")) {
    path = imageUrl;
  } else if (entryId) {
    path = `${entryId}/${imageUrl}`;
  }

  try {
    return await getSignedUrl(bucket, path);
  } catch {
    return null;
  }
}

export async function uploadEntryImage(entryId, file) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const objectPath = `${entryId}/main.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(objectPath, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) throw new Error(error.message);

  return toSbUrl(IMAGE_BUCKET, objectPath);
}

export async function getAudioSignedUrl(entryId, audioPath) {
  if (!audioPath) return null;
  let path = audioPath;
  if (audioPath.startsWith("sb://entry-audio/")) {
    path = audioPath.slice("sb://entry-audio/".length);
  }
  return getSignedUrl(AUDIO_BUCKET, path);
}
