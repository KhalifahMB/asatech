/**
 * Order and transaction service.
 */
import { client } from './client';

export function listOrders(params = {}) {
  return client.get('/orders', params);
}

export function getOrder(refOrId) {
  return client.get(`/orders/${encodeURIComponent(refOrId)}`);
}

/** Admin — list all orders across customers. */
export function listAllOrders(params = {}) {
  return client.get('/orders/admin/all', params);
}

/** Admin — update order status. */
export function updateOrderStatus(ref, status) {
  return client.patch(`/orders/admin/${encodeURIComponent(ref)}/status`, {
    status,
  });
}

/** Admin — trigger / resend a specific email for an order. */
export function sendOrderEmail(ref, type) {
  return client.post(`/orders/admin/${encodeURIComponent(ref)}/send-email`, {
    type,
  });
}

/** Admin — delete an unpaid order (within 2 h of creation). */
export function deleteOrder(id) {
  return client.delete(`/orders/admin/${encodeURIComponent(id)}`);
}

/** Customer — update the shipping address of an unpaid order. */
export function updateOrderAddress(id, address) {
  return client.patch(`/orders/${encodeURIComponent(id)}/address`, address);
}

export function listTransactions(params = {}) {
  return client.get('/transactions', params);
}

export function getTransaction(ref) {
  return client.get(`/transactions/${encodeURIComponent(ref)}`);
}

/** Admin — list all transactions. */
export function listAllTransactions(params = {}) {
  return client.get('/transactions/admin/all', params);
}
