/**
 * Fraud alert service.
 * All endpoints require admin authentication.
 */
import { client } from "./client";

export function listFraudAlerts(params = {}) {
  return client.get("/fraud/alerts", params);
}

export function getFraudAlert(id) {
  return client.get(`/fraud/alerts/${encodeURIComponent(id)}`);
}

export function updateFraudAlert(id, patch) {
  return client.patch(`/fraud/alerts/${encodeURIComponent(id)}`, patch);
}
