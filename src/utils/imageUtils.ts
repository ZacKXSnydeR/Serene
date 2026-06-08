/**
 * ULTIMATE IMAGE RESOLVER for YTMusic API Responses
 * Handles every known thumbnail structure, nested path, and edge case.
 * DO NOT access thumbnails manually in components — always use these utilities.
 */

import { getBaseUrl } from '../api/client';

// Transparent dark placeholder to prevent broken image icons & layout shift
const DEFAULT_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Crect width='100%25' height='100%25' fill='%23141414'/%3E%3C/svg%3E";

interface ResolveOptions {
  /** Desired size strategy */
  targetSize?: "highest" | "lowest" | number;
  /** Custom fallback if nothing is found */
  fallbackUrl?: string;
  /** If true, keeps protocol-relative URLs as-is (default: false -> https:) */
  keepProtocolRelative?: boolean;
}

/* ═══════════════════════════════════════════
   INTERNAL HELPERS
   ═══════════════════════════════════════════ */

function sanitizeUrl(url: string | undefined, keepProtocolRelative = false): string {
  if (!url || typeof url !== "string") return "";
  let s = url.trim();
  if (!keepProtocolRelative && s.startsWith("//")) s = "https:" + s;
  // Remove accidental whitespace inside the string
  s = s.replace(/\s/g, "");
  return s;
}

function isValidUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\//.test(url) || /^data:image\//.test(url);
}

/**
 * Extract the best URL from a thumbnail / sources array.
 */
function extractFromThumbnails(
  arr: any[],
  targetSize: ResolveOptions["targetSize"] = "highest"
): string {
  if (!Array.isArray(arr) || arr.length === 0) return "";

  // Normalise entries: accept {url}, {src}, {clientServerImageUrl}
  const valid = arr.filter((t) => t && (t.url || t.src || t.clientServerImageUrl));
  if (valid.length === 0) return "";

  if (targetSize === "highest") {
    const sized = valid.filter((t) => typeof t.width === "number");
    if (sized.length > 0) {
      const best = sized.reduce((a, b) => (a.width >= b.width ? a : b));
      return sanitizeUrl(best.url || best.src || best.clientServerImageUrl);
    }
    return sanitizeUrl(valid[valid.length - 1].url || valid[valid.length - 1].src || valid[valid.length - 1].clientServerImageUrl);
  }

  if (targetSize === "lowest") {
    const sized = valid.filter((t) => typeof t.width === "number");
    if (sized.length > 0) {
      const best = sized.reduce((a, b) => (a.width <= b.width ? a : b));
      return sanitizeUrl(best.url || best.src || best.clientServerImageUrl);
    }
    return sanitizeUrl(valid[0].url || valid[0].src || valid[0].clientServerImageUrl);
  }

  // Specific numeric target size -> closest match
  if (typeof targetSize === "number") {
    const sized = valid.filter((t) => typeof t.width === "number");
    if (sized.length > 0) {
      const closest = sized.reduce((a, b) =>
        Math.abs(a.width - targetSize) <= Math.abs(b.width - targetSize) ? a : b
      );
      return sanitizeUrl(closest.url || closest.src || closest.clientServerImageUrl);
    }
    return sanitizeUrl(valid[Math.floor(valid.length / 2)].url || valid[Math.floor(valid.length / 2)].src);
  }

  return sanitizeUrl(valid[valid.length - 1].url || valid[valid.length - 1].src);
}

/**
 * Walk a dot-path into an object safely.
 */
function deepGet(obj: any, path: string): any {
  let current = obj;
  for (const part of path.split(".")) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/* ═══════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════ */

/**
 * Ultimate resolver. Pass ANY object from the YTMusic API (search result,
 * artist detail, album, track, home section item, account info, etc.) and
 * receive a guaranteed-valid image URL.
 */
export function resolveImageUrl(item: any, options?: ResolveOptions): string {
  if (!item) {
    // console.debug("[ImageUtils] resolveImageUrl called with null/undefined item.");
    return options?.fallbackUrl || DEFAULT_PLACEHOLDER;
  }

  const targetSize = options?.targetSize ?? "highest";
  const keepRelative = options?.keepProtocolRelative ?? false;

  // Helper to log invalid URLs that were found but rejected
  const logInvalid = (strategy: string, url: string) => {
    console.warn(`[ImageUtils] ${strategy} found an invalid URL: "${url}"`, item);
  };

  // ═══ Strategy 1: Pre-resolved poster field (used by our own mappers) ═══
  if (typeof item.poster === "string" && item.poster.trim()) {
    const url = sanitizeUrl(item.poster, keepRelative);
    if (isValidUrl(url)) return url;
    logInvalid("Strategy 1 (poster)", url);
  }

  // ═══ Strategy 2: Direct thumbnails array (most common) ═══
  if (item.thumbnails && Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
    const url = extractFromThumbnails(item.thumbnails, targetSize);
    if (isValidUrl(url)) return url;
    logInvalid("Strategy 2 (thumbnails array)", url);
  }

  // ═══ Strategy 2.5: Singular thumbnail array (watch playlists) ═══
  if (item.thumbnail && Array.isArray(item.thumbnail) && item.thumbnail.length > 0) {
    const url = extractFromThumbnails(item.thumbnail, targetSize);
    if (isValidUrl(url)) return url;
    logInvalid("Strategy 2.5 (singular thumbnail array)", url);
  }

  // ═══ Strategy 3: Common nested thumbnail paths in YT responses ═══
  const nestedThumbPaths = [
    "snippet.thumbnails",
    "thumbnail.thumbnails",
    "thumbnailRenderer.thumbnail.thumbnails",
    "thumbnailRenderer.playlistVideoThumbnailRenderer.thumbnail.thumbnails",
    "thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails",
    "thumbnail.croppedSquareThumbnailRenderer.thumbnail.thumbnails",
    "thumbnail.croppedLandscapeThumbnailRenderer.thumbnail.thumbnails",
    "avatar.thumbnails",
    "header.musicImmersiveHeaderRenderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails",
    "header.c4TabbedHeaderRenderer.avatar.thumbnails",
    "thumbnailDetails.thumbnails",
    "videoDetails.thumbnails",
    "musicResponsiveListItemRenderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails",
    "musicTwoRowItemRenderer.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails",
  ];
  for (const path of nestedThumbPaths) {
    const found = deepGet(item, path);
    if (found && Array.isArray(found) && found.length > 0) {
      const url = extractFromThumbnails(found, targetSize);
      if (isValidUrl(url)) return url;
      logInvalid(`Strategy 3 (nested path: ${path})`, url);
    }
  }

  // ═══ Strategy 4: Sources array (e.g. decoratedAvatarViewModel) ═══
  if (item.sources && Array.isArray(item.sources) && item.sources.length > 0) {
    const url = extractFromThumbnails(item.sources, targetSize);
    if (isValidUrl(url)) return url;
    logInvalid("Strategy 4 (sources array)", url);
  }
  // Nested sources paths
  const nestedSourcesPaths = [
    "image.decoratedAvatarViewModel.avatar.avatarViewModel.image.sources",
    "avatar.image.sources",
    "image.sources",
  ];
  for (const path of nestedSourcesPaths) {
    const found = deepGet(item, path);
    if (found && Array.isArray(found) && found.length > 0) {
      const url = extractFromThumbnails(found, targetSize);
      if (isValidUrl(url)) return url;
      logInvalid(`Strategy 4.5 (nested sources path: ${path})`, url);
    }
  }

  // ═══ Strategy 5: Single string fields ═══
  const stringFields = ["thumbnail", "image", "cover", "artwork", "background", "banner", "avatar", "photo", "picture"];
  for (const field of stringFields) {
    if (typeof item[field] === "string" && item[field].trim()) {
      const url = sanitizeUrl(item[field], keepRelative);
      if (isValidUrl(url)) return url;
      logInvalid(`Strategy 5 (string field: ${field})`, url);
    }
  }

  // ═══ Strategy 6: Object wrappers with .url ═══
  const urlObjectFields = ["image", "cover", "artwork", "thumbnail", "avatar", "banner"];
  for (const field of urlObjectFields) {
    if (item[field] && typeof item[field] === "object" && typeof item[field].url === "string") {
      const url = sanitizeUrl(item[field].url, keepRelative);
      if (isValidUrl(url)) return url;
      logInvalid(`Strategy 6 (object wrapper: ${field}.url)`, url);
    }
  }

  // ═══ Strategy 7: Look inside nested music/card renderers (random YT internal keys) ═══
  // Walk one level deep looking for any thumbnails array
  for (const key of Object.keys(item)) {
    const val = item[key];
    if (val && typeof val === "object") {
      if (val.thumbnails && Array.isArray(val.thumbnails) && val.thumbnails.length > 0) {
        const url = extractFromThumbnails(val.thumbnails, targetSize);
        if (isValidUrl(url)) return url;
      }
      if (val.thumbnail && typeof val.thumbnail === "string") {
        const url = sanitizeUrl(val.thumbnail, keepRelative);
        if (isValidUrl(url)) return url;
      }
      // second level deep
      for (const innerKey of Object.keys(val)) {
        const inner = val[innerKey];
        if (inner && typeof inner === "object") {
          if (inner.thumbnails && Array.isArray(inner.thumbnails) && inner.thumbnails.length > 0) {
            const url = extractFromThumbnails(inner.thumbnails, targetSize);
            if (isValidUrl(url)) return url;
          }
          if (inner.thumbnail && typeof inner.thumbnail === "string") {
            const url = sanitizeUrl(inner.thumbnail, keepRelative);
            if (isValidUrl(url)) return url;
          }
        }
      }
    }
  }

  // ═══ Strategy 8: Fallback to any string that looks like a URL in the object ═══
  // (last resort safety net)
  function findAnyUrl(obj: any, depth = 0): string {
    if (depth > 4) return "";
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "string" && val.length > 10) {
        const lower = val.toLowerCase();
        if (lower.includes("googleusercontent.com") || lower.includes("ggpht.com") || lower.includes("ytimg.com")) {
          const url = sanitizeUrl(val, keepRelative);
          if (isValidUrl(url)) return url;
        }
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        const found = findAnyUrl(val, depth + 1);
        if (found) return found;
      }
    }
    return "";
  }
  const anyUrl = findAnyUrl(item);
  if (anyUrl) return anyUrl;

  // ═══ FINAL GUARANTEED SAFE FALLBACK ═══
  if (item && Object.keys(item).length > 0) {
    console.error(`[ImageUtils] CRITICAL: Exhausted all strategies! Failed to resolve ANY image URL for this item. Falling back to placeholder.`, item);
  }
  return options?.fallbackUrl || DEFAULT_PLACEHOLDER;
}

/**
 * Wraps an image URL in our local Python proxy to bypass CDN origin/referer blocks.
 */
function applyProxy(url: string): string {
  if (!url || url === DEFAULT_PLACEHOLDER || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${getBaseUrl()}/proxy/image?url=${encodeURIComponent(url)}`;
}

/**
 * Legacy wrapper — identical to resolveImageUrl with highest resolution.
 * Use this when you just need "the best image available".
 */
export const getPosterUrl = (item: any): string => {
  return applyProxy(resolveImageUrl(item, { targetSize: "highest" }));
};

/**
 * Legacy wrapper — pass a raw URL string to sanitise & normalise it.
 * If the input is already a string (not an API object), use this.
 */
export const getHighResImage = (url: string | undefined): string => {
  const resolved = sanitizeUrl(url);
  if (!resolved) return DEFAULT_PLACEHOLDER;
  if (isValidUrl(resolved)) return applyProxy(resolved);
  return DEFAULT_PLACEHOLDER;
};

/**
 * Get a specific target width (e.g. 64 for small avatars, 512 for covers).
 */
export const resolveImageTarget = (item: any, targetPx: number): string => {
  return applyProxy(resolveImageUrl(item, { targetSize: targetPx }));
};

/**
 * Quick boolean check — does this item have *any* usable image data?
 */
export const hasImage = (item: any): boolean => {
  return resolveImageUrl(item) !== DEFAULT_PLACEHOLDER;
};
