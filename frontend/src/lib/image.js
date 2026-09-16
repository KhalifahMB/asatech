import { config } from "@/services/config";

const IMAGE_ENDPOINT = config.apiBaseUrl
  ? `${config.apiBaseUrl.replace(/\/+$/, "")}/images`
  : "";

/**
 * Resolve a product image to a full URL served by the backend.
 *
 * Handles three shapes:
 * - Full URLs (`https://...` or `http://...`) are returned unchanged.
 * - Legacy public paths (`/images/phone-1.jpg`) are normalized to the
 *   backend image endpoint.
 * - Bare filenames (`phone-1.jpg`) are resolved against the backend image
 *   endpoint.
 */
export function productImageUrl(src) {
  if (!src) return "";
  if (/^https?:\/\//i.test(src)) return src;
  const clean = src.replace(/^\/images\//, "");
  return IMAGE_ENDPOINT ? `${IMAGE_ENDPOINT}/${encodeURIComponent(clean)}` : clean;
}