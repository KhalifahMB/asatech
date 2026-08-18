/**
 * Order and transaction service.
 */
import { client } from "./client";

export function listOrders(params = {}) {
  return client.get("/orders", params);
}

export function getOrder(refOrId) {
  return client.get(`/orders/${encodeURIComponent(refOrId)}`);
}

/** Admin — list all orders across customers. */
export function listAllOrders(params = {}) {
  return client.get("/orders/admin/all", params);
}

/** Admin — update order status. */
export function updateOrderStatus(ref, status) {
  return client.patch(`/orders/admin/${encodeURIComponent(ref)}/status`, { status });
}

export function listTransactions(params = {}) {
  return client.get("/transactions", params);
}

export function getTransaction(ref) {
  return client.get(`/transactions/${encodeURIComponent(ref)}`);
}

/** Admin — list all transactions. */
export function listAllTransactions(params = {}) {
  return client.get("/transactions/admin/all", params);
}
