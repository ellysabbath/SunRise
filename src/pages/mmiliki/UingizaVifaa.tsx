import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PackagePlus, Plus, Trash2, Save, Search, Package,
  AlertTriangle, CheckCircle2, Clock, XCircle,
  Layers, List, Store, Upload, Image as ImageIcon, X,
  RefreshCw, Loader2, Check, Copy,
} from 'lucide-react'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { productsApi, type Product } from '../../services/products'
import {
  inventoryApi,
  type StockMovement,
} from '../../services/inventory'
import { useAuth } from '../../context/AuthContext'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ==================================================================
// HARD-CODED OPTIONS
// ==================================================================
const KUNDI_OPTIONS = [
  { id: 'saruji', name: 'Saruji' },
  { id: 'nondo', name: 'Nondo' },
  { id: 'mabati', name: 'Mabati' },
  { id: 'mbao', name: 'Mbao' },
  { id: 'rangi', name: 'Rangi' },
  { id: 'bomba', name: 'Bomba' },
  { id: 'umeme', name: 'Umeme' },
  { id: 'zana', name: 'Zana' },
  { id: 'vifaa-vya-ofisi', name: 'Vifaa vya Ofisi' },
  { id: 'nyingine', name: 'Nyingine' },
]

const KIPIMO_OPTIONS = [
  { id: 'mfuko', name: 'Mfuko' },
  { id: 'kg', name: 'Kg' },
  { id: 'mita', name: 'Mita' },
  { id: 'lita', name: 'Lita' },
  { id: 'kipande', name: 'Kipande' },
  { id: 'dazeni', name: 'Dazeni' },
  { id: 'futi', name: 'Futi' },
]

// ==================================================================
// Helper: SKU Generator
// ==================================================================
function generateSkuFor(jina: string, kundi: string): string {
  const cleanJina = (jina || '').trim()
  if (!cleanJina) return ''

  const prefix =
    cleanJina
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3) || 'SKU'

  const catPrefix =
    (kundi || 'GEN')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 2) || 'GN'

  const ts = Date.now().toString(36).toUpperCase().slice(-3)
  const rand = Math.floor(10 + Math.random() * 90)

  return `${prefix}-${catPrefix}${ts}${rand}`
}

// ==================================================================
// Bulk row type
// ==================================================================
interface BulkRow {
  tempId: string
  jina: string
  sku: string
  categoryId: string
  unitId: string
  beiMauzo: number
  beiUnunuzi: number
  stoki: number
  status: 'pending' | 'saving' | 'ok' | 'error'
  error?: string
  productId?: string
}

function newBulkRow(): BulkRow {
  return {
    tempId: Math.random().toString(36).slice(2),
    jina: '',
    sku: '',
    categoryId: KUNDI_OPTIONS[0].id,
    unitId: KIPIMO_OPTIONS[0].id,
    beiMauzo: 0,
    beiUnunuzi: 0,
    stoki: 0,
    status: 'pending',
  }
}

// ==================================================================
// PichaUpload
// ==================================================================
function PichaUpload({
  value,
  onChange,
}: {
  value?: string
  onChange: (dataUrl: string | undefined) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(
    null
  )

  const compressAndSet = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        let { width, height } = img
        if (width > height && width > MAX) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else if (height > MAX) {
          width = Math.round((width * MAX) / height)
          height = MAX
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, width, height)
        let dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        let quality = 0.85
        while (dataUrl.length > 800_000 && quality > 0.3) {
          quality -= 0.1
          dataUrl = canvas.toDataURL('image/jpeg', quality)
        }
        onChange(dataUrl)
      }
      img.onerror = () =>
        setAlert({
          title: 'Imeshindwa kusoma picha',
          message: 'Faili si picha halali.',
        })
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAlert({
        title: 'Faili si picha',
        message: 'Chagua picha halali (PNG, JPG, WEBP).',
      })
      return
    }
    compressAndSet(file)
  }

  return (
    <div>
      <label className="text-sm font-medium">Picha ya Bidhaa</label>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt="picha" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={24} className="text-slate-300" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium"
            >
              <Upload size={14} /> {value ? 'Badilisha' : 'Pakia'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-red-600 hover:bg-red-50"
              >
                <X size={12} /> Ondoa
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Picha itapunguzwa hadi 800px automatically
          </p>
        </div>
      </div>
      {alert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setAlert(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 text-center">
            <AlertTriangle size={26} className="text-red-600 mx-auto" />
            <h3 className="font-semibold mt-3">{alert.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{alert.message}</p>
            <button
              onClick={() => setAlert(null)}
              className="mt-4 w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold"
            >
              Sawa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================================================================
// MAIN
// ==================================================================
export default function UingizaVifaa({ role }: { role: 'mmiliki' | 'admin' }) {
  const { user } = useAuth()

  const [stores, setStores] = useState<StoreType[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'moja' | 'bulk' | 'historia'>('moja')
  const [selectedStoreId, setSelectedStoreId] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [str, prods, movs] = await Promise.all([
        storesApi.list(),
        productsApi.list(),
        inventoryApi.movements({ movement_type: 'manunuzi' }),
      ])
      setStores(str)
      setProducts(prods)
      setMovements(movs)
      if (str.length > 0 && !selectedStoreId) setSelectedStoreId(str[0].id)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Imeshindikana kupata data. Angalia muunganisho.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedStore = stores.find((s) => s.id === selectedStoreId)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <PackagePlus size={26} className="text-brand-600" /> Ingiza Vifaa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ongeza bidhaa — muuzaji atathibitisha "Nimepokea"
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Sasisha
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={load} className="text-xs font-semibold underline">
            Jaribu tena
          </button>
        </div>
      )}

      {/* Chagua duka */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4">
        <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <Store size={14} /> Duka la Kuingiza
        </label>
        {loading ? (
          <SkeletonLine className="h-10 w-full mt-2" />
        ) : stores.length === 0 ? (
          <div className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Hakuna maduka — ongeza duka kwanza.
          </div>
        ) : (
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm bg-white"
          >
            {stores.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {d.location}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <TabButton
          active={tab === 'moja'}
          onClick={() => setTab('moja')}
          Icon={Plus}
          label="Moja kwa Moja"
        />
        <TabButton
          active={tab === 'bulk'}
          onClick={() => setTab('bulk')}
          Icon={Layers}
          label="Bulk (Wengi)"
        />
        <TabButton
          active={tab === 'historia'}
          onClick={() => setTab('historia')}
          Icon={List}
          label="Historia"
        />
      </div>

      {/* Content */}
      {!loading && stores.length > 0 && (
        <>
          {tab === 'moja' && selectedStore && (
            <FomuMoja
              store={selectedStore}
              mtumiaji={user?.full_name || 'Mmiliki'}
              nafasi={role}
              onSuccess={load}
            />
          )}
          {tab === 'bulk' && selectedStore && (
            <FomuBulk
              store={selectedStore}
              mtumiaji={user?.full_name || 'Mmiliki'}
              onSuccess={load}
            />
          )}
          {tab === 'historia' && (
            <Historia movements={movements} loading={loading} />
          )}
        </>
      )}
    </div>
  )
}

// ==================================================================
// TabButton
// ==================================================================
function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  Icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border whitespace-nowrap transition ${
        active
          ? 'bg-brand-600 text-white border-brand-600 font-semibold'
          : 'bg-white border-slate-200 hover:bg-slate-50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}

// ==================================================================
// FomuMoja
// ==================================================================
function FomuMoja({
  store,
  mtumiaji,
  nafasi,
  onSuccess,
}: {
  store: StoreType
  mtumiaji: string
  nafasi: 'mmiliki' | 'admin'
  onSuccess: () => void
}) {
  const [jina, setJina] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState(KUNDI_OPTIONS[0].id)
  const [unitId, setUnitId] = useState(KIPIMO_OPTIONS[0].id)
  const [beiMauzo, setBeiMauzo] = useState(0)
  const [beiUnunuzi, setBeiUnunuzi] = useState(0)
  const [stoki, setStoki] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (jina.trim() && !sku.trim()) {
      const autoSku = generateSkuFor(jina, categoryId)
      if (autoSku) setSku(autoSku)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jina])

  const regenerateSku = () => {
    if (!jina.trim()) {
      setError('Weka jina la bidhaa kwanza')
      return
    }
    const autoSku = generateSkuFor(jina, categoryId)
    setSku(autoSku)
    setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!jina.trim()) return setError('Jina linahitajika')
    if (!categoryId) return setError('Chagua kundi')
    if (!unitId) return setError('Chagua kipimo')
    if (beiMauzo <= 0) return setError('Bei ya mauzo si sahihi')
    if (beiUnunuzi <= 0) return setError('Bei ya ununuzi si sahihi')
    if (stoki <= 0) return setError('Stoki si sahihi')

    let finalSku = sku.trim().toUpperCase()
    if (!finalSku) {
      finalSku = generateSkuFor(jina, categoryId)
      setSku(finalSku)
    }

    if (!finalSku) {
      return setError('SKU haikuweza kutengenezwa. Jaribu tena.')
    }

    const categoryName =
      KUNDI_OPTIONS.find((c) => c.id === categoryId)?.name || 'Nyingine'
    const unitName =
      KIPIMO_OPTIONS.find((u) => u.id === unitId)?.name || 'Kipande'

    setLoading(true)
    try {
      const product = await productsApi.create({
        sku: finalSku,
        name: jina.trim(),
        category_text: categoryName,
        unit_text: unitName,
        cost_price: beiUnunuzi,
        selling_price: beiMauzo,
        is_active: true,
      } as any)

      await inventoryApi.adjust({
        product_id: product.id,
        store_id: store.id,
        quantity: stoki,
        movement_type: 'manunuzi',
        note: `Imeingizwa na ${mtumiaji}`,
      })

      setSuccess(
        `Bidhaa "${product.name}" imeingizwa. SKU: ${finalSku}`
      )
      setJina('')
      setSku('')
      setBeiMauzo(0)
      setBeiUnunuzi(0)
      setStoki(0)
      setTimeout(() => {
        setSuccess('')
        onSuccess()
      }, 3000)
    } catch (err: any) {
      const data = err?.response?.data

      if (data?.sku) {
        setError(`SKU: ${data.sku[0]}`)
      } else if (data?.category_text) {
        setError(`Kundi: ${data.category_text[0]}`)
      } else if (data?.unit_text) {
        setError(`Kipimo: ${data.unit_text[0]}`)
      } else if (data?.detail) {
        setError(data.detail)
      } else if (data?.name) {
        setError(`Jina: ${data.name[0]}`)
      } else {
        setError('Imeshindikana kuunda bidhaa.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Store size={14} /> Duka:{' '}
        <span className="font-semibold text-slate-800">{store.name}</span>
      </div>

      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm font-medium">
            Jina la Bidhaa <span className="text-red-500">*</span>
          </label>
          <input
            value={jina}
            onChange={(e) => setJina(e.target.value)}
            placeholder="Mfano: Saruji Dangote 50kg"
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              SKU <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={regenerateSku}
              disabled={loading || !jina.trim()}
              className="text-[10px] text-brand-600 hover:underline font-semibold disabled:opacity-50"
            >
              Auto-tengeneza
            </button>
          </div>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            placeholder="SAR-DAN-1234"
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm font-mono disabled:bg-slate-50"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            {sku.trim() ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <Check size={10} /> SKU imejazwa
              </span>
            ) : (
              'Inatengenezwa automatically jina linapojazwa'
            )}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">
            Kundi <span className="text-red-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm bg-white disabled:bg-slate-50"
          >
            {KUNDI_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Bei ya Mauzo (TZS) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={beiMauzo || ''}
            onChange={(e) => setBeiMauzo(Number(e.target.value))}
            placeholder="18500"
            min={0}
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Bei ya Ununuzi (TZS) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={beiUnunuzi || ''}
            onChange={(e) => setBeiUnunuzi(Number(e.target.value))}
            placeholder="16000"
            min={0}
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Kipimo <span className="text-red-500">*</span>
          </label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm bg-white disabled:bg-slate-50"
          >
            {KIPIMO_OPTIONS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Stoki <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={stoki || ''}
            onChange={(e) => setStoki(Number(e.target.value))}
            placeholder="200"
            min={1}
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Inaingiza...
          </>
        ) : (
          <>
            <Save size={16} />
            Ingiza Bidhaa
          </>
        )}
      </button>
    </form>
  )
}

// ==================================================================
// FomuBulk — Ingiza bidhaa nyingi kwa wakati mmoja
// ==================================================================
function FomuBulk({
  store,
  mtumiaji,
  onSuccess,
}: {
  store: StoreType
  mtumiaji: string
  onSuccess: () => void
}) {
  const [rows, setRows] = useState<BulkRow[]>([newBulkRow()])
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<{
    ok: number
    fail: number
  } | null>(null)

  // ------------------------------------------------------------------
  // Update row
  // ------------------------------------------------------------------
  const updateRow = (tempId: string, patch: Partial<BulkRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r))
    )
  }

  // ------------------------------------------------------------------
  // Auto SKU per row
  // ------------------------------------------------------------------
  const autoSku = (tempId: string) => {
    const row = rows.find((r) => r.tempId === tempId)
    if (!row) return
    if (!row.jina.trim()) return
    const sku = generateSkuFor(row.jina, row.categoryId)
    updateRow(tempId, { sku })
  }

  // ------------------------------------------------------------------
  // Add/Remove rows
  // ------------------------------------------------------------------
  const addRow = () => setRows((prev) => [...prev, newBulkRow()])
  const removeRow = (tempId: string) =>
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((r) => r.tempId !== tempId)
    )
  const duplicateRow = (tempId: string) => {
    const row = rows.find((r) => r.tempId === tempId)
    if (!row) return
    setRows((prev) => [
      ...prev,
      {
        ...newBulkRow(),
        jina: row.jina,
        sku: '', // SKU mpya itatengenezwa
        categoryId: row.categoryId,
        unitId: row.unitId,
        beiMauzo: row.beiMauzo,
        beiUnunuzi: row.beiUnunuzi,
        stoki: row.stoki,
      },
    ])
  }

  // ------------------------------------------------------------------
  // Validation
  // ------------------------------------------------------------------
  const rowErrors = (r: BulkRow): string[] => {
    const errs: string[] = []
    if (!r.jina.trim()) errs.push('Jina')
    if (r.beiMauzo <= 0) errs.push('Bei mauzo')
    if (r.beiUnunuzi <= 0) errs.push('Bei ununuzi')
    if (r.stoki <= 0) errs.push('Stoki')
    return errs
  }

  const validRows = rows.filter((r) => rowErrors(r).length === 0)
  const invalidCount = rows.length - validRows.length

  // ------------------------------------------------------------------
  // Save all
  // ------------------------------------------------------------------
  const saveAll = async () => {
    if (validRows.length === 0) return

    setSaving(true)
    setSummary(null)

    let ok = 0
    let fail = 0

    for (const row of rows) {
      if (rowErrors(row).length > 0) continue

      updateRow(row.tempId, { status: 'saving', error: undefined })

      try {
        const categoryName =
          KUNDI_OPTIONS.find((c) => c.id === row.categoryId)?.name ||
          'Nyingine'
        const unitName =
          KIPIMO_OPTIONS.find((u) => u.id === row.unitId)?.name || 'Kipande'

        let finalSku = row.sku.trim().toUpperCase()
        if (!finalSku) {
          finalSku = generateSkuFor(row.jina, row.categoryId)
        }

        const product = await productsApi.create({
          sku: finalSku,
          name: row.jina.trim(),
          category_text: categoryName,
          unit_text: unitName,
          cost_price: row.beiUnunuzi,
          selling_price: row.beiMauzo,
          is_active: true,
        } as any)

        await inventoryApi.adjust({
          product_id: product.id,
          store_id: store.id,
          quantity: row.stoki,
          movement_type: 'manunuzi',
          note: `Imeingizwa (bulk) na ${mtumiaji}`,
        })

        updateRow(row.tempId, {
          status: 'ok',
          sku: finalSku,
          productId: product.id,
        })
        ok++
      } catch (err: any) {
        const data = err?.response?.data
        let msg = 'Imeshindikana'
        if (data?.sku) msg = `SKU: ${data.sku[0]}`
        else if (data?.name) msg = `Jina: ${data.name[0]}`
        else if (data?.detail) msg = data.detail
        else if (data?.category_text) msg = `Kundi: ${data.category_text[0]}`
        else if (data?.unit_text) msg = `Kipimo: ${data.unit_text[0]}`

        updateRow(row.tempId, { status: 'error', error: msg })
        fail++
      }
    }

    setSaving(false)
    setSummary({ ok, fail })

    // Kama zote zimefanikiwa, subiri kidogo kisha reload
    if (fail === 0 && ok > 0) {
      setTimeout(() => {
        setRows([newBulkRow()])
        setSummary(null)
        onSuccess()
      }, 2000)
    } else {
      // Ongeza rows mpya kwa zilizoshindikana? Acha kama zilivyo.
      onSuccess()
    }
  }

  // ------------------------------------------------------------------
  // Reset
  // ------------------------------------------------------------------
  const resetAll = () => {
    if (saving) return
    if (!confirm('Una uhakika unataka kufuta mistari yote?')) return
    setRows([newBulkRow()])
    setSummary(null)
  }

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0">
          <Layers size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Ingiza Bidhaa Nyingi</div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ongeza mistari kadhaa, kisha bofya "Hifadhi Zote" mara moja.
            Duka: <strong>{store.name}</strong>
          </p>
        </div>
      </div>

      {/* Summary ya mwisho */}
      {summary && (
        <div
          className={`flex items-start gap-2 p-3 rounded-lg text-sm border ${
            summary.fail === 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            {summary.ok} zimefanikiwa
            {summary.fail > 0 && `, ${summary.fail} zimeshindikana`}.
            {summary.fail > 0 && ' Angalia mistari yenye makosa.'}
          </div>
          <button
            onClick={() => setSummary(null)}
            className="text-xs font-semibold underline"
          >
            Funga
          </button>
        </div>
      )}

      {/* Rows */}
      <div className="space-y-3">
        {rows.map((r, idx) => {
          const errs = rowErrors(r)
          return (
            <div
              key={r.tempId}
              className={`bg-white rounded-2xl border p-3 md:p-4 ${
                r.status === 'ok'
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : r.status === 'error'
                  ? 'border-red-300 bg-red-50/30'
                  : 'border-slate-200'
              }`}
            >
              {/* Row header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 grid place-items-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  {r.status === 'saving' && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                      <Loader2 size={12} className="animate-spin" /> Inahifadhi...
                    </span>
                  )}
                  {r.status === 'ok' && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 size={12} /> Imehifadhiwa
                    </span>
                  )}
                  {r.status === 'error' && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-700 font-medium">
                      <XCircle size={12} /> {r.error || 'Imeshindikana'}
                    </span>
                  )}
                  {r.status === 'pending' && errs.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                      <AlertTriangle size={12} /> {errs.join(', ')}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateRow(r.tempId)}
                    disabled={saving || r.status === 'saving'}
                    title="Nakili"
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-40"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(r.tempId)}
                    disabled={saving || rows.length === 1 || r.status === 'saving'}
                    title="Ondoa"
                    className="p-1.5 rounded-md hover:bg-red-50 text-red-600 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                {/* Jina */}
                <div className="md:col-span-4">
                  <label className="text-[10px] font-medium text-slate-600 mb-1 block">
                    Jina *
                  </label>
                  <input
                    value={r.jina}
                    onChange={(e) =>
                      updateRow(r.tempId, { jina: e.target.value })
                    }
                    onBlur={() => {
                      if (r.jina.trim() && !r.sku.trim()) autoSku(r.tempId)
                    }}
                    placeholder="Saruji Dangote 50kg"
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                  />
                </div>

                {/* SKU */}
                <div className="md:col-span-3">
                  <label className="text-[10px] font-medium text-slate-600 mb-1 block">
                    SKU
                  </label>
                  <input
                    value={r.sku}
                    onChange={(e) =>
                      updateRow(r.tempId, {
                        sku: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Auto"
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-xs font-mono disabled:bg-slate-50"
                  />
                </div>

                {/* Kundi */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-medium text-slate-600 mb-1 block">
                    Kundi
                  </label>
                  <select
                    value={r.categoryId}
                    onChange={(e) =>
                      updateRow(r.tempId, { categoryId: e.target.value })
                    }
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-xs bg-white disabled:bg-slate-50"
                  >
                    {KUNDI_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kipimo */}
                <div className="md:col-span-2">
                  <label className="text-[10px] font-medium text-slate-600 mb-1 block">
                    Kipimo
                  </label>
                  <select
                    value={r.unitId}
                    onChange={(e) =>
                      updateRow(r.tempId, { unitId: e.target.value })
                    }
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-xs bg-white disabled:bg-slate-50"
                  >
                    {KIPIMO_OPTIONS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nambari */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-600 mb-1 block">
                    Bei Mauzo (TZS) *
                  </label>
                  <input
                    type="number"
                    value={r.beiMauzo || ''}
                    onChange={(e) =>
                      updateRow(r.tempId, {
                        beiMauzo: Number(e.target.value),
                      })
                    }
                    placeholder="18500"
                    min={0}
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600 mb-1 block">
                    Bei Ununuzi (TZS) *
                  </label>
                  <input
                    type="number"
                    value={r.beiUnunuzi || ''}
                    onChange={(e) =>
                      updateRow(r.tempId, {
                        beiUnunuzi: Number(e.target.value),
                      })
                    }
                    placeholder="16000"
                    min={0}
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-600 mb-1 block">
                    Stoki *
                  </label>
                  <input
                    type="number"
                    value={r.stoki || ''}
                    onChange={(e) =>
                      updateRow(r.tempId, { stoki: Number(e.target.value) })
                    }
                    placeholder="200"
                    min={1}
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={addRow}
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
        >
          <Plus size={16} /> Ongeza Mstari
        </button>
        <button
          type="button"
          onClick={resetAll}
          disabled={saving || rows.length === 1}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <Trash2 size={16} /> Futa Yote
        </button>
        <button
          type="button"
          onClick={saveAll}
          disabled={saving || validRows.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Inahifadhi {validRows.length}...
            </>
          ) : (
            <>
              <Save size={16} />
              Hifadhi Zote ({validRows.length})
            </>
          )}
        </button>
      </div>

      {invalidCount > 0 && validRows.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Mistari {invalidCount} haina taarifa kamili na itarukwa.
        </div>
      )}
    </div>
  )
}

// ==================================================================
// Historia
// ==================================================================
function Historia({
  movements,
  loading,
}: {
  movements: StockMovement[]
  loading: boolean
}) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return movements
    return movements.filter(
      (m) =>
        m.product_name.toLowerCase().includes(query) ||
        (m.note || '').toLowerCase().includes(query)
    )
  }, [movements, q])

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tafuta bidhaa..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:border-brand-500 outline-none text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-200 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine className="h-4 w-32" />
                <SkeletonLine className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-semibold">Hakuna historia</h3>
          <p className="text-sm text-slate-500 mt-1">
            Uingizaji wa bidhaa utaonekana hapa.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{m.product_name}</div>
                <div className="text-xs text-slate-500 truncate">
                  {m.store_name} — {m.note || '—'}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(m.created_at)} — {m.created_by_name}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-emerald-700">
                  +{parseFloat(m.quantity).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">
                  {formatTsh(m.unit_cost)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}