import axios from "axios";
import { getAccessToken } from "@/lib/supabase";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

// Attach Supabase JWT for FastAPI routes that verify Bearer tokens
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Resolve a backend-served image URL into an absolute URL.
 * Recipes store `image_url` as a relative path like "/api/entries/{id}/image" so the
 * value is stable across deploys. The frontend may be served from a different origin
 * (preview, PWA, native shell), so we always prefix the backend host.
 */
export function resolveImageUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return `${BACKEND_URL}${url}`;
  return url;
}

/** Resolve entry thumbnail — Supabase storage paths are served via FastAPI proxy. */
export function entryImageSrc(entry) {
  if (!entry?.image_url) return null;
  const url = entry.image_url;
  if (url.startsWith("sb://") || (!url.startsWith("http") && !url.startsWith("/api/"))) {
    return `${BACKEND_URL}/api/entries/${entry.entry_id}/image`;
  }
  return resolveImageUrl(url);
}

// Placeholder images for recipes without a user-provided photo
export const RECIPE_PLACEHOLDERS = [
  "https://images.unsplash.com/photo-1766766788517-4bc7b9aff43a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHxydXN0aWMlMjBmb29kJTIwc291cCUyMGJyZWFkfGVufDB8fHx8MTc3ODA4MzA5Nnww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1740527618707-ec19fde2a6cb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwyfHxydXN0aWMlMjBmb29kJTIwc291cCUyMGJyZWFkfGVufDB8fHx8MTc3ODA4MzA5Nnww&ixlib=rb-4.1.0&q=85",
];

export function placeholderFor(id) {
  if (!id) return RECIPE_PLACEHOLDERS[0];
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return RECIPE_PLACEHOLDERS[sum % RECIPE_PLACEHOLDERS.length];
}
