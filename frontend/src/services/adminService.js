/**
 * Admin operations service (admin-only endpoints).
 */
import { client } from "./client";

export function listCustomers(params = {}) {
  return client.get("/admin/customers", params);
}

export function getCustomer(id) {
  return client.get(`/admin/customers/${encodeURIComponent(id)}`);
}

export function listAuditLogs(params = {}) {
  return client.get("/admin/audit-logs", params);
}

export function getAnalytics() {
  return client.get("/admin/analytics");
}

// ── Product management ──────────────────────────────────────────────────
export function createProduct(product) {
  return client.post("/admin/products", product);
}

export function updateProduct(id, patch) {
  return client.patch(`/admin/products/${encodeURIComponent(id)}`, patch);
}

export function deleteProduct(id) {
  return client.delete(`/admin/products/${encodeURIComponent(id)}`);
}

export function adjustStock(id, quantity) {
  return updateProduct(id, { stock: Math.max(0, Number(quantity) || 0) });
}

// ── Maintenance / ops actions ───────────────────────────────────────────
/**
 * Reconcile every pending/processing transaction against Paystack and settle
 * or fail it (and its linked order) accordingly. Returns a run summary.
 */
export function syncTransactions() {
  return client.post("/admin/transactions/sync", {});
}

/**
 * Migrate legacy `/images/...` product image paths to bare filenames so they
 * resolve through the backend image endpoint.
 */
export function migrateProductImages() {
  return client.post("/admin/products/migrate-images", {});
}

/**
 * Seed the default admin account and sample product catalogue (only if they
 * don't exist yet). Requires an explicit confirm flag.
 */
export function seedCatalogue() {
  return client.post("/admin/maintenance/seed-catalogue", { confirm: true });
}
