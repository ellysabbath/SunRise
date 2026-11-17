import api from "../lib/axios";

// ==================================================================
// Types
// ==================================================================
export type AinaDocument =
  | "mauzo"
  | "stoki"
  | "wateja"
  | "madeni"
  | "gharama"
  | "jumla";

export type DocFormat = "pdf" | "csv";

export type HaliDocument = "tayari" | "inasindika" | "imemalizika";

export interface DocumentMeta {
  id: string;
  jina: string;
  aina: AinaDocument;
  format: DocFormat;
  hali: HaliDocument;
  ukubwa: string;
  kipindi: string;
  store: string | null;
  store_id?: string | null;    // ✅ ongeza
  store_name: string;
  aliyezalisha: string;
  aliyezalisha_name: string;
  data_snapshot: Record<string, any>;
  created_at: string;
}

export interface GenerateDocumentPayload {
  aina: AinaDocument;
  format?: DocFormat;
  store_id?: string;
  start?: string;
  end?: string;
}

export interface Store {
  id: string;
  name: string;
  location?: string;
}

// ==================================================================
// API
// ==================================================================
export const documentsApi = {
  list: (params?: { aina?: AinaDocument; store?: string; limit?: number }) =>
    api.get<DocumentMeta[]>("/documents/", { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<DocumentMeta>(`/documents/${id}/`).then((r) => r.data),

  generate: (payload: GenerateDocumentPayload) =>
    api.post<DocumentMeta>("/documents/generate/", payload).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/documents/${id}/`).then((r) => r.data),

  downloadPdf: (id: string) =>
    api
      .get(`/documents/${id}/download/`, { responseType: "blob" })
      .then((r) => r.data as Blob),

  downloadCsv: (id: string) =>
    api
      .get(`/documents/${id}/download-csv/`, { responseType: "blob" })
      .then((r) => r.data as Blob),
};

// ==================================================================
// Stores — kwa selector
// ==================================================================
export const storesApi = {
  list: () => api.get<Store[]>("/stores/").then((r) => r.data),
};