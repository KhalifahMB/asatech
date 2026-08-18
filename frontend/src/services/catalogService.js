/**
 * Product catalogue service.
 * Fetches product data from the backend API via the shared HTTP client.
 */
import { client } from "./client";

/**
 * List products with optional filtering, sorting and pagination.
 * @param {object} params - { search, category, minPrice, maxPrice, inStock, sort, page, limit }
 * @returns {Promise<Array>} Product list (with attached `.meta` pagination)
 */
export function listProducts(params = {}) {
  return client.get("/products", params);
}

/**
 * Get a single product by slug or ID.
 * @param {string} slugOrId - Product slug or Mongo ObjectId
 * @returns {Promise<object>}
 */
export function getProduct(slugOrId) {
  return client.get(`/products/${encodeURIComponent(slugOrId)}`);
}

/**
 * Get featured products.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export function getFeatured(limit = 8) {
  return client.get("/products/featured", { limit });
}

/**
 * Get products related to a given product (same category).
 * Fetches from the catalogue with a category filter.
 * @param {object} product - Reference product
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getRelated(product, limit = 4) {
  if (!product?.category) return [];
  try {
    const list = await listProducts({ category: product.category, limit: limit + 1 });
    return (list || []).filter((p) => p._id !== product._id && p.slug !== product.slug).slice(0, limit);
  } catch {
    return [];
  }
}
