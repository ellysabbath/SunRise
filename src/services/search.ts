import api from "../lib/axios";
import { productsApi, type Product } from "./products";
import { customersApi, type Customer } from "./customers";
import { ordersApi } from "./orders";

export type SearchType = "bidhaa" | "mteja" | "order";

export interface SearchResult {
  type: SearchType
  title: string
  subtitle: string
  route: string
  Icon: any // lucide icon type
}

/**
 * Tafuta kote: bidhaa, wateja, orders
 */
export async function searchEverything(
  query: string,
  options?: { limit?: number }
): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const limit = options?.limit ?? 5

  try {
    const [products, customers, orders] = await Promise.all([
      productsApi.list().catch(() => [] as Product[]),
      customersApi.list().catch(() => [] as Customer[]),
      ordersApi.list().catch(() => [] as any[]),
    ])

    const results: SearchResult[] = []

    // Bidhaa
    products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .slice(0, limit)
      .forEach((p) => {
        results.push({
          type: "bidhaa",
          title: p.name,
          subtitle: `SKU: ${p.sku} — TZS ${parseFloat(p.selling_price).toLocaleString()}`,
          route: `/muuzaji`,
          Icon: null,
        })
      })

    // Wateja
    customers
      .filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.phone.includes(q)
      )
      .slice(0, limit)
      .forEach((c) => {
        results.push({
          type: "mteja",
          title: c.full_name,
          subtitle: c.phone,
          route: `/muuzaji/wateja`,
          Icon: null,
        })
      })

    // Orders
    orders
      .filter(
        (o: any) =>
          o.id.toLowerCase().includes(q) ||
          (o.customer_name || "").toLowerCase().includes(q)
      )
      .slice(0, limit)
      .forEach((o: any) => {
        results.push({
          type: "order",
          title: `Order #${o.id.slice(0, 8).toUpperCase()}`,
          subtitle: `${o.customer_name || "Mteja"} — TZS ${parseFloat(o.total).toLocaleString()}`,
          route: `/muuzaji/risiti`,
          Icon: null,
        })
      })

    return results.slice(0, 15)
  } catch {
    return []
  }
}