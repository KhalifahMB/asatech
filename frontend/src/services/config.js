/**
 * Frontend application configuration.
 *
 * Configure the backend API URL and Paystack public key via environment
 * variables. See `.env.example` for available options.
 */
export const config = {
  // Backend API base URL (e.g., "https://api.asatech.ng")
  apiBaseUrl: import.meta.env?.VITE_API_BASE_URL || "",
  // Paystack PUBLIC key (safe for browser use)
  paystackPublicKey: import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY || "",
  // Application mode
  appMode: import.meta.env?.VITE_APP_MODE || "development",
};

/**
 * Check if backend API is configured.
 * @returns {boolean} True if API URL is set
 */
export const isApiConfigured = () => Boolean(config.apiBaseUrl);
