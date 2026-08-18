import { config, isApiConfigured } from "./config";

/**
 * Structured API error for safe UI rendering.
 * Does not expose stack traces or internal details to users.
 */
export class ApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TOKEN_KEY = "asatech-token";

/**
 * Read auth token from localStorage.
 * Kept as a function (not module-level constant) so the token is always fresh.
 */
function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Build a query string from an object of params.
 */
function buildQuery(params) {
  if (!params || typeof params !== "object") return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, String(value));
    }
  });
  const str = search.toString();
  return str ? `?${str}` : "";
}

/**
 * HTTP client for API requests.
 * - Automatically attaches Bearer token when available
 * - Handles JSON serialization
 * - Emits typed errors with safe messages
 * - Handles session expiry by clearing local session and redirecting
 */
async function request(method, path, body, options = {}) {
  if (!isApiConfigured()) {
    throw new ApiError(
      "API endpoint not configured. Please set VITE_API_BASE_URL environment variable.",
      { code: "API_NOT_CONFIGURED" }
    );
  }

  // Build URL — for GET requests, treat `body` as query params
  let url = `${config.apiBaseUrl.replace(/\/$/, "")}${path}`;
  if (method === "GET" && body) {
    url += buildQuery(body);
  }

  // Attach auth token if available
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: method !== "GET" && body != null ? JSON.stringify(body) : undefined,
      signal: options.signal,
      credentials: "same-origin",
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("Request cancelled.", { code: "ABORTED" });
    }
    throw new ApiError(
      "A network error occurred. Please check your connection and try again.",
      { code: "NETWORK_ERROR" }
    );
  }

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    // Handle session expiry — clear stored token so the user is bounced to /login
    if (res.status === 401 && token) {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("asatech-user");
      } catch {
        /* ignore */
      }
    }

    const message =
      data?.error?.message ||
      data?.message ||
      data?.error ||
      "The request could not be completed.";
    throw new ApiError(message, {
      status: res.status,
      code: data?.error?.code || data?.code,
      details: data,
    });
  }

  // Backend wraps responses in { success, data, ... }. Unwrap `data` transparently
  // so callers get the resource directly.
  if (data && typeof data === "object" && "success" in data && "data" in data) {
    // Preserve pagination metadata by attaching it to the returned array/object
    if (Array.isArray(data.data) && (data.total != null || data.page != null)) {
      const arr = data.data;
      arr.meta = {
        total: data.total,
        page: data.page,
        pages: data.pages,
        count: data.count,
      };
      return arr;
    }
    return data.data;
  }

  return data;
}

export const client = {
  get: (path, params, opts) => request("GET", path, params, opts),
  post: (path, body, opts) => request("POST", path, body, opts),
  put: (path, body, opts) => request("PUT", path, body, opts),
  patch: (path, body, opts) => request("PATCH", path, body, opts),
  delete: (path, opts) => request("DELETE", path, null, opts),
};
