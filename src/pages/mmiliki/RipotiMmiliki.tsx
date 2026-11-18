
import { useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode, ElementType } from 'react'
import {
  FileText,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Loader2,
  FileSpreadsheet,
  Calendar,
  Store as StoreIcon,
  AlertTriangle,
  Filter,
  TrendingUp,
  Package,
  Users,
  Wallet,
  Receipt,
} from 'lucide-react'

import {
  documentsApi,
  storesApi,
  type DocumentMeta,
  type AinaDocument,
  type DocFormat,
  type Store as StoreType,
} from '../../services/documents'

// ==================================================================
// Meta — aina zote 6
// ==================================================================

const AINA_LABEL: Record<AinaDocument, string> = {
  mauzo: 'Mauzo',
  gharama: 'Gharama',
  jumla: 'Jumla (Kamili)',
  madeni: 'Madeni',
  wateja: 'Wateja',
  stoki: 'Stoki',
}

const AINA_DESC: Record<AinaDocument, string> = {
  mauzo: 'Mauzo yote, COGS, faida ghafi, orders',
  gharama: 'Opex, mishahara, gharama zote',
  jumla: 'Mauzo + Gharama + Faida + Zaka + Sadaka',
  madeni: 'Orders za deni, deni jumla',
  wateja: 'Wateja wote, manunuzi, madeni',
  stoki: 'Bidhaa zote, stoki, zimeisha, thamani',
}

const AINA_ICON: Record<AinaDocument, ElementType> = {
  mauzo: TrendingUp,
  gharama: Receipt,
  jumla: FileText,
  madeni: Wallet,
  wateja: Users,
  stoki: Package,
}

const FORMAT_LABEL: Record<DocFormat, string> = {
  pdf: 'PDF',
  csv: 'CSV',
}

const FORMAT_ICON: Record<DocFormat, ElementType> = {
  pdf: FileText,
  csv: FileSpreadsheet,
}

const FORMAT_EXT: Record<DocFormat, string> = {
  pdf: 'pdf',
  csv: 'csv',
}

// ==================================================================
// Page
// ==================================================================

export default function RipotiMmiliki() {
  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [stores, setStores] = useState<StoreType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterAina, setFilterAina] = useState<AinaDocument | ''>('')
  const [filterStore, setFilterStore] = useState<string>('')

  // Generate modal
  const [genOpen, setGenOpen] = useState(false)
  const [genAina, setGenAina] = useState<AinaDocument>('mauzo')
  const [genFormat, setGenFormat] = useState<DocFormat>('pdf')
  const [genStore, setGenStore] = useState<string>('')
  const [genStart, setGenStart] = useState('')
  const [genEnd, setGenEnd] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<DocumentMeta | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // ------------------------------------------------------------------
  // Load stores
  // ------------------------------------------------------------------

  useEffect(() => {
    storesApi
      .list()
      .then(setStores)
      .catch(() => setStores([]))
  }, [])

  // ------------------------------------------------------------------
  // Load documents
  // ------------------------------------------------------------------

  const loadDocs = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await documentsApi.list({
        aina: filterAina || undefined,
        store: filterStore || undefined,
        limit: 100,
      })

      setDocs(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Imeshindwa kupakua ripoti')
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [filterAina, filterStore])

  useEffect(() => {
    void loadDocs()
  }, [loadDocs])

  // ------------------------------------------------------------------
  // Generate report
  // ------------------------------------------------------------------

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError('')

    try {
      await documentsApi.generate({
        aina: genAina,
        format: genFormat,
        store_id: genStore || undefined,
        start: genStart || undefined,
        end: genEnd || undefined,
      })

      setGenOpen(false)
      setGenAina('mauzo')
      setGenFormat('pdf')
      setGenStore('')
      setGenStart('')
      setGenEnd('')

      await loadDocs()
    } catch (e: any) {
      setGenError(
        e?.response?.data?.detail || 'Imeshindwa kutengeneza ripoti'
      )
    } finally {
      setGenerating(false)
    }
  }

  // ------------------------------------------------------------------
  // Download — PDF au CSV
  // ------------------------------------------------------------------

  const handleDownload = async (doc: DocumentMeta) => {
    setDownloadingId(doc.id)

    try {
      const blob =
        doc.format === 'csv'
          ? await documentsApi.downloadCsv(doc.id)
          : await documentsApi.downloadPdf(doc.id)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url

      const baseName = doc.jina.replace(/\.(pdf|csv|xlsx)$/i, '')
      a.download = `${baseName}.${FORMAT_EXT[doc.format] || 'pdf'}`

      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || 'Imeshindwa kupakua faili'
      )
    } finally {
      setDownloadingId(null)
    }
  }

  // ------------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------------

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      await documentsApi.remove(deleteTarget.id)

      setDeleteTarget(null)

      setDocs((prev) =>
        prev.filter((d) => d.id !== deleteTarget.id)
      )
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || 'Imeshindwa kufuta ripoti'
      )
    } finally {
      setDeleting(false)
    }
  }

  // ------------------------------------------------------------------
  // Stats
  // ------------------------------------------------------------------

  const stats = useMemo(() => {
    return {
      total: docs.length,
      pdf: docs.filter((d) => d.format === 'pdf').length,
      csv: docs.filter((d) => d.format === 'csv').length,
    }
  }, [docs])

  // ==================================================================
  // Render
  // ==================================================================

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Ripoti &amp; Documents
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Tengeneza, pakua, na simamia ripoti za duka lako
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => void loadDocs()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>

          <button
            onClick={() => {
              setGenError('')
              setGenOpen(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
          >
            <Plus size={16} />
            Tengeneza Ripoti
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />

          <span className="flex-1">{error}</span>

          <button
            onClick={() => setError('')}
            className="text-red-500 hover:text-red-700"
            aria-label="Funga ujumbe wa kosa"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Jumla" value={stats.total} color="brand" />
        <StatCard label="PDF" value={stats.pdf} color="red" />
        <StatCard label="CSV" value={stats.csv} color="emerald" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">

          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              <Filter size={12} className="inline mr-1" />
              Aina ya Ripoti
            </label>

            <select
              value={filterAina}
              onChange={(e) =>
                setFilterAina(e.target.value as AinaDocument | '')
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
            >
              <option value="">Zote</option>

              {(Object.keys(AINA_LABEL) as AinaDocument[]).map((a) => (
                <option key={a} value={a}>
                  {AINA_LABEL[a]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              <StoreIcon size={12} className="inline mr-1" />
              Duka
            </label>

            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
            >
              <option value="">Maduka yote</option>

              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.location ? ` -- ${s.location}` : ''}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Loader2
            size={32}
            className="animate-spin mx-auto text-brand-600"
          />

          <p className="text-sm text-slate-500 mt-3">
            Inapakia ripoti...
          </p>
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />

          <h3 className="font-semibold text-slate-900">
            Hakuna ripoti bado
          </h3>

          <p className="text-sm text-slate-500 mt-1">
            Bonyeza &quot;Tengeneza Ripoti&quot; kuanza
          </p>

          <button
            onClick={() => {
              setGenError('')
              setGenOpen(true)
            }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
          >
            <Plus size={16} />
            Tengeneza Ripoti ya Kwanza
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">
                    Jina
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-700">
                    Aina
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-700">
                    Format
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-700">
                    Duka
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-700">
                    Kipindi
                  </th>

                  <th className="text-left px-4 py-3 font-semibold text-slate-700">
                    Ukubwa
                  </th>

                  <th className="text-right px-4 py-3 font-semibold text-slate-700">
                    Vitendo
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {docs.map((doc) => {
                  const FormatIcon =
                    FORMAT_ICON[doc.format] || FileText

                  const AinaIcon =
                    AINA_ICON[doc.aina] || FileText

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50">

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FormatIcon size={16} className="text-slate-400" />

                          <span className="font-medium text-slate-900 truncate max-w-xs">
                            {doc.jina}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                          <AinaIcon size={12} />
                          {AINA_LABEL[doc.aina] || doc.aina}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold uppercase text-slate-600">
                          {FORMAT_LABEL[doc.format] || doc.format}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        {doc.store_name || '—'}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        {doc.kipindi || '—'}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-600">
                        {doc.ukubwa || '—'}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">

                          <button
                            onClick={() => void handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                            className="p-1.5 rounded-md text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                            title="Pakua"
                          >
                            {downloadingId === doc.id ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Download size={14} />
                            )}
                          </button>

                          <button
                            onClick={() => setDeleteTarget(doc)}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                            title="Futa"
                          >
                            <Trash2 size={14} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {docs.map((doc) => {
              const FormatIcon =
                FORMAT_ICON[doc.format] || FileText

              const AinaIcon =
                AINA_ICON[doc.aina] || FileText

              return (
                <div key={doc.id} className="p-4">

                  <div className="flex items-start gap-3">
                    <FormatIcon
                      size={20}
                      className="text-slate-400 mt-0.5 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {doc.jina}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          <AinaIcon size={10} />
                          {AINA_LABEL[doc.aina] || doc.aina}
                        </span>

                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-semibold uppercase">
                          {FORMAT_LABEL[doc.format]}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        {doc.store_name || '—'} • {doc.kipindi || '—'} • {doc.ukubwa || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => void handleDownload(doc)}
                      disabled={downloadingId === doc.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50"
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Download size={12} />
                      )}
                      Pakua
                    </button>

                    <button
                      onClick={() => setDeleteTarget(doc)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* ================= GENERATE MODAL ================= */}
      {genOpen && (
        <Modal onClose={() => setGenOpen(false)}>
          <div className="p-5">

            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Tengeneza Ripoti Mpya
                </h3>

                <p className="text-sm text-slate-500 mt-0.5">
                  Chagua aina, format, duka, na kipindi
                </p>
              </div>

              <button
                onClick={() => setGenOpen(false)}
                className="p-1 rounded-md hover:bg-slate-100"
                aria-label="Funga"
              >
                <X size={18} />
              </button>
            </div>

            {genError && (
              <div className="mb-3 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {genError}
              </div>
            )}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">

              {/* Aina */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Aina ya Ripoti
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(AINA_LABEL) as AinaDocument[]).map((a) => {
                    const Icon = AINA_ICON[a]
                    const active = genAina === a

                    return (
                      <button
                        key={a}
                        onClick={() => setGenAina(a)}
                        className={`flex items-start gap-2 p-2 rounded-lg border-2 text-left transition ${
                          active
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon
                          size={16}
                          className={
                            active ? 'text-brand-600' : 'text-slate-500'
                          }
                        />

                        <div className="min-w-0">
                          <div
                            className={`text-xs font-semibold ${
                              active ? 'text-brand-700' : 'text-slate-700'
                            }`}
                          >
                            {AINA_LABEL[a]}
                          </div>

                          <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                            {AINA_DESC[a]}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  Format
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FORMAT_LABEL) as DocFormat[]).map((f) => {
                    const Icon = FORMAT_ICON[f]

                    return (
                      <button
                        key={f}
                        onClick={() => setGenFormat(f)}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-xs font-semibold transition ${
                          genFormat === f
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={16} />
                        {FORMAT_LABEL[f]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Store */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">
                  <StoreIcon size={12} className="inline mr-1" />
                  Duka
                </label>

                <select
                  value={genStore}
                  onChange={(e) => setGenStore(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
                >
                  <option value="">Maduka yote</option>

                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.location ? ` — ${s.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tarehe */}
              <div className="grid grid-cols-2 gap-3">

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    <Calendar size={12} className="inline mr-1" />
                    Kuanzia
                  </label>

                  <input
                    type="date"
                    value={genStart}
                    onChange={(e) => setGenStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">
                    <Calendar size={12} className="inline mr-1" />
                    Hadi
                  </label>

                  <input
                    type="date"
                    value={genEnd}
                    onChange={(e) => setGenEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-brand-500 outline-none"
                  />
                </div>

              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setGenOpen(false)}
                disabled={generating}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
              >
                Ghairi
              </button>

              <button
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {generating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Inatengeneza...
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    Tengeneza
                  </>
                )}
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* ================= DELETE MODAL ================= */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <div className="p-5 text-center">

            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 grid place-items-center mx-auto">
              <Trash2 size={24} className="text-red-600" />
            </div>

            <h3 className="font-semibold text-slate-900 mt-3">
              Futa Ripoti?
            </h3>

            <p className="text-sm text-slate-500 mt-1">
              Una uhakika unataka kufuta{' '}
              <strong>{deleteTarget.jina}</strong>?
              Kitendo hiki hakiwezi kurudishwa.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
              >
                Ghairi
              </button>

              <button
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Futa
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  )
}

// ==================================================================
// Helper components
// ==================================================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  return (
    <div
      className={`p-3 rounded-xl border ${
        colors[color] || colors.brand
      }`}
    >
      <div className="text-xs font-semibold opacity-75">
        {label}
      </div>

      <div className="text-2xl font-bold mt-0.5">
        {value}
      </div>
    </div>
  )
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}
