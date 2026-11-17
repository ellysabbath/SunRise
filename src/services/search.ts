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
  Icon?: any // lucide icon type
}

// ✅ Options type — inakubali store na scope
export interface SearchOptions {
  limit?: number
  store?: string
  scope?: SearchType[]
}

/**
 * Tafuta kote: bidhaa, wateja, orders
 */
export async function searchEverything(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const { limit = 5, store, scope } = options

  // ✅ Kama scope imetolewa, tumia — vinginevyo tafuta zote
  const shouldSearch = (type: SearchType) =>
    !scope || scope.includes(type)

  try {
    // ✅ Fetch tu data zinazohitajika (kulingana na scope)
    const [products, customers, orders] = await Promise.all([
      shouldSearch("bidhaa")
        ? productsApi.list().catch(() => [] as Product[])
        : Promise.resolve([] as Product[]),
      shouldSearch("mteja")
        ? customersApi.list().catch(() => [] as Customer[])
        : Promise.resolve([] as Customer[]),
      shouldSearch("order")
        ? ordersApi.list().catch(() => [] as any[])
        : Promise.resolve([] as any[]),
    ])

    const results: SearchResult[] = []

    // Bidhaa
    if (shouldSearch("bidhaa")) {
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
            // ✅ Route inategemea store
            route: store ? `/mteja/bidhaa?store=${store}` : `/mteja/bidhaa`,
            Icon: null,
          })
        })
    }

    // Wateja
    if (shouldSearch("mteja")) {
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
    }

    // Orders
    if (shouldSearch("order")) {
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
    }

    return results.slice(0, 15)
  } catch {
    return []
  }
}