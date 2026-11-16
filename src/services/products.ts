import api from "../lib/axios";

export interface Category {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  category_name: string;
  unit: string;
  unit_name: string;
  cost_price: string;
  selling_price: string;
  low_stock_alert: number;
  is_active: boolean;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  category?: string;        // UUID (optional)
  category_text?: string;   // ✅ Maandishi
  unit?: string;            // UUID (optional)
  unit_text?: string;       // ✅ Maandishi
  cost_price: number;
  selling_price: number;
  low_stock_alert?: number;
  is_active?: boolean;
}

export const productsApi = {
  list: (storeId?: string) =>
    api
      .get<Product[]>("/products/", {
        params: storeId ? { store: storeId } : {},
      })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<Product>(`/products/${id}/`).then((r) => r.data),

  create: (payload: CreateProductPayload) =>
    api.post<Product>("/products/", payload).then((r) => r.data),

  update: (id: string, payload: Partial<Product>) =>
    api.patch<Product>(`/products/${id}/`, payload).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/products/${id}/`).then((r) => r.data),

  categories: () =>
    api.get<Category[]>("/products/categories/").then((r) => r.data),

  createCategory: (name: string) =>
    api.post<Category>("/products/categories/", { name }).then((r) => r.data),

  units: () =>
    api.get<Unit[]>("/products/units/").then((r) => r.data),

  createUnit: (name: string) =>
    api.post<Unit>("/products/units/", { name }).then((r) => r.data),
};