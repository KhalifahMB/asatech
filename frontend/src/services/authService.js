/**
 * Authentication service.
 *
 * Handles user authentication via the backend API.
 * Tokens are stored in localStorage for session persistence.
 */
import { client } from "./client";

const TOKEN_KEY = "asatech-token";
const USER_KEY = "asatech-user";

/**
 * Store authentication session.
 * @param {string|null} token - JWT token
 * @param {object|null} user - User object
 */
export function setSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* localStorage unavailable — session will not persist */
  }
}

/**
 * Get stored user from localStorage.
 * @returns {object|null} User object or null
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Get stored auth token.
 * @returns {string|null}
 */
export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Authenticate user with email and password.
 * Backend returns { token, user } inside a `data` envelope which the
 * client transparently unwraps.
 */
export async function login({ email, password }) {
  const response = await client.post("/auth/login", { email, password });
  if (response?.token && response?.user) {
    setSession(response.token, response.user);
  }
  return response;
}

/**
 * Register a new user account.
 */
export async function register({ name, email, password, phone }) {
  const response = await client.post("/auth/register", { name, email, password, phone });
  if (response?.token && response?.user) {
    setSession(response.token, response.user);
  }
  return response;
}

/**
 * Request password reset email.
 */
export async function requestPasswordReset(email) {
  return client.post("/auth/password/reset-request", { email });
}

/**
 * Reset password with token from email.
 */
export async function resetPassword({ token, password }) {
  return client.post("/auth/password/reset", { token, password });
}

/**
 * Logout user (clear local session).
 * Notifies backend if possible; ignores errors so the client is always logged out locally.
 */
export async function logout() {
  try {
    await client.post("/auth/logout");
  } catch {
    /* Best-effort — always clear local session */
  }
  setSession(null, null);
  return { ok: true };
}

/**
 * Get current authenticated user (from local storage).
 * For a fresh copy, call fetchCurrentUser().
 */
export function getCurrentUser() {
  return getStoredUser();
}

/**
 * Fetch the current user from the server (verifies session).
 */
export async function fetchCurrentUser() {
  const response = await client.get("/auth/me");
  if (response?.user) {
    // Refresh the cached user
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    } catch {
      /* ignore */
    }
  }
  return response;
}
