import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type MovementType =
  | "manunuzi"
  | "mauzo"
  | "kurudisha"
  | "marekebisho"
  | "uharibifu";

export type AdjustmentStatus = "inasubiri" | "imekubaliwa" | "imekataliwa";

export interface StockLevel {
  id: string;
  product: string;
  product_name: string;
  store: string;
  store_name: string;
  quantity: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product: string;
  product_name: string;
  store: string;
  store_name: string;
  movement_type: MovementType;
  quantity: string;
  unit_cost: string;
  reference_id: string | null;
  reference_type: string;
  note: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  product: string;
  product_name: string;
  store: string;
  store_name: string;
  reason: string;
  quantity: string;
  status: AdjustmentStatus;
  requested_by: string;
  requested_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  created_at: string;
}

// ==================================================================
// API
// ==================================================================
export const inventoryApi = {
  // ------------------------------------------------------------------
  // Stock levels
  // ------------------------------------------------------------------
  stockLevels: (params?: { store?: string; product?: string }) =>
    api
      .get<StockLevel[]>("/inventory/stock-levels/", { params })
      .then((r) => r.data),

  // ------------------------------------------------------------------
  // Movements
  // ------------------------------------------------------------------
  movements: (params?: {
    product?: string;
    store?: string;
    movement_type?: MovementType;
    reference_type?: string;
  }) =>
    api
      .get<StockMovement[]>("/inventory/movements/", { params })
      .then((r) => r.data),

  // ------------------------------------------------------------------
  // Adjust (moja kwa moja — bila idhini)
  // ------------------------------------------------------------------
  adjust: (payload: {
    product_id: string;
    store_id: string;
    quantity: number;
    movement_type: MovementType;
    note?: string;
  }) =>
    api.post<StockMovement>("/inventory/adjust/", payload).then((r) => r.data),

  // ------------------------------------------------------------------
  // Stock adjustments (idhini)
  // ------------------------------------------------------------------
  stockAdjustments: (params?: {
    store?: string;
    status?: AdjustmentStatus;
    product?: string;
  }) =>
    api
      .get<StockAdjustment[]>("/inventory/stock-adjustments/", { params })
      .then((r) => r.data),

  createAdjustment: (payload: {
    product_id: string;
    store_id: string;
    reason: string;
    quantity: number;
  }) =>
    api
      .post<StockAdjustment>("/inventory/stock-adjustments/", payload)
      .then((r) => r.data),

  approveAdjustment: (id: string) =>
    api
      .post<StockAdjustment>(
        `/inventory/stock-adjustments/${id}/approve/`
      )
      .then((r) => r.data),

  rejectAdjustment: (id: string) =>
    api
      .post<StockAdjustment>(
        `/inventory/stock-adjustments/${id}/reject/`
      )
      .then((r) => r.data),
};