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

export type DocFormat = "pdf" | "csv" | "excel";

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

// ==================================================================
// API
// ==================================================================
export const documentsApi = {
  // ------------------------------------------------------------------
  // List
  // ------------------------------------------------------------------
  list: (params?: { aina?: AinaDocument; store?: string; limit?: number }) =>
    api.get<DocumentMeta[]>("/documents/", { params }).then((r) => r.data),

  // ------------------------------------------------------------------
  // Get
  // ------------------------------------------------------------------
  get: (id: string) =>
    api.get<DocumentMeta>(`/documents/${id}/`).then((r) => r.data),

  // ------------------------------------------------------------------
  // Generate
  // ------------------------------------------------------------------
  generate: (payload: GenerateDocumentPayload) =>
    api.post<DocumentMeta>("/documents/generate/", payload).then((r) => r.data),

  // ------------------------------------------------------------------
  // Remove
  // ------------------------------------------------------------------
  remove: (id: string) =>
    api.delete(`/documents/${id}/`).then((r) => r.data),

  // ------------------------------------------------------------------
  // ✅ Download PDF
  // ------------------------------------------------------------------
  downloadPdf: (id: string) =>
    api
      .get(`/documents/${id}/download/`, {
        responseType: "blob",
      })
      .then((r) => r.data as Blob),

  // ------------------------------------------------------------------
  // ✅ Download CSV
  // ------------------------------------------------------------------
  downloadCsv: (id: string) =>
    api
      .get(`/documents/${id}/download-csv/`, {
        responseType: "blob",
      })
      .then((r) => r.data as Blob),
};