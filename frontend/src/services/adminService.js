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
