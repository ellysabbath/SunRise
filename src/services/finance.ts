import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type TitheType = "zaka" | "sadaka";

export interface TitheOffering {
  id: string;
  payment_type: TitheType;
  amount: string;
  receipt_number: string;
  note: string;
  paid_date: string;
  recorded_by: string;
  created_at: string;
}

// ==================================================================
// API
// ==================================================================
export const financeApi = {
  titheOfferings: (params?: { type?: TitheType }) =>
    api
      .get<TitheOffering[]>("/finance/tithe-offerings/", { params })
      .then((r) => r.data),

  createTitheOffering: (payload: {
    payment_type: TitheType;
    amount: number;
    receipt_number: string;
    note?: string;
    paid_date: string;
  }) =>
    api
      .post<TitheOffering>("/finance/tithe-offerings/", payload)
      .then((r) => r.data),
};