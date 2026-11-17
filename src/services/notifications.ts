import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type NotificationChannel = "sms" | "email";

export interface NotificationLog {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
  success: boolean;
  error: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationStats {
  total: number;
  read: number;
  unread: number;
  sms_total: number;
  sms_success: number;
  sms_failed: number;
  email_total: number;
  email_success: number;
  email_failed: number;
}

export interface OTPRecord {
  id: string;
  phone: string;
  code: string;
  purpose: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

// ✅ Params type moja — tumia kwa logs() na list()
export interface NotificationLogsParams {
  channel?: NotificationChannel;
  recipient?: string;
  success?: boolean;
  read?: boolean;
  limit?: number;
  store?: string;        // ✅ ongeza hii
}

// ==================================================================
// API
// ==================================================================
export const notificationsApi = {
  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------
  stats: () =>
    api.get<NotificationStats>("/notifications/stats/").then((r) => r.data),

  // ------------------------------------------------------------------
  // Logs (list + filter)
  // ------------------------------------------------------------------
  logs: (params?: NotificationLogsParams) =>
    api
      .get<NotificationLog[]>("/notifications/logs/", { params })
      .then((r) => r.data),

  // Alias rahisi
  list: (params?: NotificationLogsParams) =>
    api
      .get<NotificationLog[]>("/notifications/logs/", { params })
      .then((r) => r.data),

  // ------------------------------------------------------------------
  // Log moja
  // ------------------------------------------------------------------
  get: (id: string) =>
    api
      .get<NotificationLog>(`/notifications/logs/${id}/`)
      .then((r) => r.data),

  // ------------------------------------------------------------------
  // Mark as read (PATCH — moja)
  // ------------------------------------------------------------------
  markAsRead: (id: string) =>
    api
      .patch<NotificationLog>(`/notifications/logs/${id}/`, { read: true })
      .then((r) => r.data),

  // ------------------------------------------------------------------
  // Mark ALL as read (bulk — PATCH kwa kila moja)
  // ------------------------------------------------------------------
  markAllRead: async (ids: string[]) => {
    if (ids.length === 0) return { updated: 0 };
    await Promise.all(
      ids.map((id) =>
        api.patch(`/notifications/logs/${id}/`, { read: true })
      )
    );
    return { updated: ids.length };
  },

  // ------------------------------------------------------------------
  // Futa (DELETE — moja)
  // ------------------------------------------------------------------
  remove: (id: string) =>
    api.delete(`/notifications/logs/${id}/`).then((r) => r.data),

  // ------------------------------------------------------------------
  // Futa zote (DELETE kwa kila moja)
  // ------------------------------------------------------------------
  removeMany: async (ids: string[]) => {
    if (ids.length === 0) return { deleted: 0 };
    await Promise.all(
      ids.map((id) => api.delete(`/notifications/logs/${id}/`))
    );
    return { deleted: ids.length };
  },

  // ------------------------------------------------------------------
  // OTPs (admin)
  // ------------------------------------------------------------------
  otps: () =>
    api.get<OTPRecord[]>("/notifications/otps/").then((r) => r.data),
};