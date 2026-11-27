
import api from "../lib/axios";

// ==================================================================
// TYPES
// ==================================================================

export type MovementType =
  | "manunuzi"
  | "mauzo"
  | "kurudisha"
  | "marekebisho"
  | "uharibifu"
  | "uhamisho";

export type AdjustmentStatus =
  | "inasubiri"
  | "imekubaliwa"
  | "imekataliwa";

// ==================================================================
// INTERFACES
// ==================================================================

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
  created_by: string | null;
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
  requested_by: string | null;
  requested_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  created_at: string;
}

export interface TransferStockPayload {
  product_id: string;
  from_store_id: string;
  to_store_id: string;
  quantity: number;
  note?: string;
}

export interface TransferStockResponse {
  message?: string;
  reference_id?: string;
  outgoing?: StockMovement;
  incoming?: StockMovement;
  movements?: StockMovement[];
}

export interface AdjustStockPayload {
  product_id: string;
  store_id: string;
  quantity: number;
  movement_type: MovementType;
  note?: string;
  reference_id?: string;
  reference_type?: string;
}

export interface CreateAdjustmentPayload {
  product_id: string;
  store_id: string;
  reason: string;
  quantity: number;
}

export interface StockLevelParams {
  store?: string;
  product?: string;
}

export interface MovementParams {
  product?: string;
  store?: string;
  movement_type?: MovementType;
  reference_type?: string;
}

export interface StockAdjustmentParams {
  store?: string;
  status?: AdjustmentStatus;
  product?: string;
}

// ==================================================================
// INVENTORY API
// ==================================================================

export const inventoryApi = {
  // --------------------------------------------------------------
  // 1. STOCK LEVELS
  // GET /api/inventory/stock-levels/
  // --------------------------------------------------------------

  stockLevels: (params?: StockLevelParams) =>
    api
      .get<StockLevel[]>("/inventory/stock-levels/", { params })
      .then((response) => response.data),

  // --------------------------------------------------------------
  // 2. TRANSFER STOCK BETWEEN STORES
  // POST /api/inventory/transfer/
  // --------------------------------------------------------------

  transfer: (payload: TransferStockPayload) =>
    api
      .post<TransferStockResponse>("/inventory/transfer/", payload)
      .then((response) => response.data),

  // --------------------------------------------------------------
  // 3. STOCK MOVEMENTS
  // GET /api/inventory/movements/
  // --------------------------------------------------------------

  movements: (params?: MovementParams) =>
    api
      .get<StockMovement[]>("/inventory/movements/", { params })
      .then((response) => response.data),

  // --------------------------------------------------------------
  // 4. ADJUST STOCK
  // POST /api/inventory/adjust/
  // --------------------------------------------------------------

  adjust: (payload: AdjustStockPayload) =>
    api
      .post<StockMovement>("/inventory/adjust/", payload)
      .then((response) => response.data),

  // --------------------------------------------------------------
  // 5. LIST STOCK ADJUSTMENTS
  // GET /api/inventory/stock-adjustments/
  // --------------------------------------------------------------

  stockAdjustments: (params?: StockAdjustmentParams) =>
    api
      .get<StockAdjustment[]>("/inventory/stock-adjustments/", {
        params,
      })
      .then((response) => response.data),

  // --------------------------------------------------------------
  // 6. CREATE STOCK ADJUSTMENT
  // POST /api/inventory/stock-adjustments/
  // --------------------------------------------------------------

  createAdjustment: (payload: CreateAdjustmentPayload) =>
    api
      .post<StockAdjustment>(
        "/inventory/stock-adjustments/",
        payload
      )
      .then((response) => response.data),

  // --------------------------------------------------------------
  // 7. APPROVE STOCK ADJUSTMENT
  // POST /api/inventory/stock-adjustments/:id/approve/
  // --------------------------------------------------------------

  approveAdjustment: (id: string) =>
    api
      .post<StockAdjustment>(
        `/inventory/stock-adjustments/${id}/approve/`
      )
      .then((response) => response.data),

  // --------------------------------------------------------------
  // 8. REJECT STOCK ADJUSTMENT
  // POST /api/inventory/stock-adjustments/:id/reject/
  // --------------------------------------------------------------

  rejectAdjustment: (id: string) =>
    api
      .post<StockAdjustment>(
        `/inventory/stock-adjustments/${id}/reject/`
      )
      .then((response) => response.data),
};

export default inventoryApi;
