import type { Page } from '@inertiajs/core'

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const setPreserveState = (page: Page<{  flash?: Record<string, string>, errors?: Record<string, string> }>) => {
    return Object.keys(page.props.errors || {}).length > 0 || 
    !page.props.flash ||
    !Object.keys(page.props.flash).length 
}

export const toSlug = (str: string): string => {
  return str
    .normalize("NFD") 
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D") 
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") 
    .replace(/\s+/g, "-") 
    .replace(/-+/g, "-"); 
}

/**
 * Remove Vietnamese diacritics (dấu) from string
 * Example: "Quốc tế" -> "quoc te"
 */
export const removeVietnameseTones = (str: string): string => {
  if (!str) return ""
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
}

/**
 * Get CSRF token from meta tag or cookie
 * @returns CSRF token string or empty string if not found
 */
export const getCsrfToken = (): string => {
  // Try to get from meta tag first
  const metaToken =
    (typeof document !== "undefined" &&
      (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)
        ?.content) ||
    "";

  if (metaToken) {
    return metaToken;
  }

  // If no meta token, try to get from cookie
  const getCookie = (name: string): string => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const token = parts.pop()?.split(';').shift() || '';
      // Decode URI component if needed
      return decodeURIComponent(token);
    }
    return '';
  };

  return getCookie("XSRF-TOKEN");
};

/**
 * Get headers with CSRF token for fetch requests
 * @param additionalHeaders - Additional headers to include (will override defaults)
 * @param includeContentType - Whether to include Content-Type header (default: true for POST/PUT/PATCH)
 * @returns HeadersInit object with CSRF token and common headers
 */
export const getCsrfHeaders = (
  additionalHeaders: Record<string, string> = {},
  includeContentType: boolean = true
): HeadersInit => {
  const csrfToken = getCsrfToken();

  const headers: HeadersInit = {
    "Accept": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...additionalHeaders,
  };

  // Only add Content-Type if explicitly requested (for POST/PUT/PATCH requests)
  if (includeContentType && !additionalHeaders["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Add CSRF token to headers
  if (csrfToken) {
    const metaToken =
      (typeof document !== "undefined" &&
        (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)
          ?.content) ||
      "";
    
    if (metaToken) {
      headers["X-CSRF-TOKEN"] = metaToken;
    } else {
      headers["X-XSRF-TOKEN"] = csrfToken;
    }
  }

  return headers;
};