/**
 * Payment service — Paystack integration boundary.
 *
 * This service handles the payment initialization flow:
 * 1. Frontend sends checkout data to POST /payments/initialize
 * 2. Backend initializes Paystack transaction and returns reference
 * 3. Frontend launches Paystack popup with the reference
 * 4. Backend verifies payment server-side (never in browser)
 *
 * IMPORTANT:
 * - Only Paystack PUBLIC key is used in frontend
 * - Payment verification happens server-side only
 * - No payment success is mocked or assumed
 */
import { client } from "./client";
import { config } from "./config";

export const PAYMENT_ENDPOINT = "/payments/initialize";

/**
 * Initialize a payment transaction.
 * 
 * Sends checkout data to backend which initializes Paystack transaction.
 * Backend returns reference and amount needed for Paystack popup.
 * 
 * @param {object} payload - { email, amount, currency, items, shipping }
 * @returns {Promise<object>} - { reference, amount, currency, authorizationUrl, metadata }
 */
export async function initializePayment(payload) {
  return client.post(PAYMENT_ENDPOINT, payload);
}

/**
 * Launch Paystack inline checkout popup.
 * 
 * Maps backend initialization response to Paystack SDK parameters.
 * Handles both inline popup and redirect fallback.
 * 
 * @param {object} init - { key, email, amount, reference, currency, metadata }
 * @param {object} handlers - { onSuccess, onClose, onError }
 * @returns {object|null} Paystack handler or null
 */
export function launchPaystack(init, handlers = {}) {
  const { key, email, amount, reference, currency = "NGN", metadata } = init;

  const publicKey = key || config.paystackPublicKey;
  if (!publicKey) {
    handlers.onError?.(
      new Error("Paystack public key not configured. Set VITE_PAYSTACK_PUBLIC_KEY.")
    );
    return null;
  }

  // Use Paystack inline SDK if available
  if (typeof window !== "undefined" && window.PaystackPop) {
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email,
      amount: Math.round(Number(amount) || 0), // Amount in kobo
      currency,
      ref: reference,
      metadata,
      callback: (response) => {
        // Callback indicates popup completed — backend must verify
        handlers.onSuccess?.(response);
      },
      onClose: () => handlers.onClose?.(),
    });
    handler.openIframe();
    return handler;
  }

  // Fallback to redirect checkout
  if (reference) {
    window.location.href = `https://checkout.paystack.com/${reference}`;
    return null;
  }

  handlers.onError?.(new Error("Paystack checkout could not be opened."));
  return null;
}

/** Load the Paystack inline JS SDK on demand. */
export function loadPaystackScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.PaystackPop) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}
