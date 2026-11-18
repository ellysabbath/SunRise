
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ElementType } from 'react'
import {
  PackagePlus, Plus, Trash2, Save, Search, Package,
  AlertTriangle, CheckCircle2, Layers, List, Store,
  RefreshCw, Loader2, XCircle, Copy, Check,
} from 'lucide-react'
import { storesApi, type Store as StoreType } from '../../services/stores'
import { productsApi } from '../../services/products'
import { inventoryApi, type StockMovement } from '../../services/inventory'
import { useAuth } from '../../context/AuthContext'
import { formatTsh, formatDate } from '../../lib/format'
import { SkeletonLine } from '../../components/Skeleton'

// ============================================================
// MAKUNDI YA BIDHAA
// ============================================================
const KUNDI_OPTIONS = [
  { id: 'saruji', name: 'Saruji na Cement' },
  { id: 'nondo', name: 'Nondo na Vyuma' },
  { id: 'mabati', name: 'Mabati na Vifaa vya Paa' },
  { id: 'mbao', name: 'Mbao na Timber' },
  { id: 'rangi', name: 'Rangi na Varnish' },
  { id: 'bomba', name: 'Mabomba na Plumbing' },
  { id: 'umeme', name: 'Vifaa vya Umeme' },
  { id: 'zana', name: 'Zana na Tools' },
  { id: 'misumari', name: 'Misumari na Screws' },
  { id: 'tiles', name: 'Tiles na Flooring' },
  { id: 'milango', name: 'Milango na Madirisha' },
  { id: 'vioo', name: 'Vioo na Glass' },
  { id: 'mifereji', name: 'Mifereji na Drainage' },
  { id: 'sanitary', name: 'Sanitary Ware' },
  { id: 'adhesives', name: 'Gundi na Adhesives' },
  { id: 'safety', name: 'Vifaa vya Usalama' },
  { id: 'ofisi', name: 'Vifaa vya Ofisi' },
  { id: 'kilimo', name: 'Vifaa vya Kilimo na Bustani' },
  { id: 'plastiki', name: 'Bidhaa za Plastiki' },
  { id: 'hardware', name: 'Hardware General' },
  { id: 'nyingine', name: 'Nyingine' },
]

// ============================================================
// VIPIMO
// ============================================================
const KIPIMO_OPTIONS = [
  { id: 'kipande', name: 'Piece / Kipande' },
  { id: 'mfuko', name: 'Mfuko / Bag' },
  { id: 'packet', name: 'Packet' },
  { id: 'box', name: 'Box / Boksi' },
  { id: 'carton', name: 'Carton' },
  { id: 'roll', name: 'Roll / Rola' },
  { id: 'bundle', name: 'Bundle / Fundo' },
  { id: 'kg', name: 'Kilogram (Kg)' },
  { id: 'gram', name: 'Gram (g)' },
  { id: 'tani', name: 'Tani (Ton)' },
  { id: 'lita', name: 'Lita (L)' },
  { id: 'ml', name: 'Millilitre (ml)' },
  { id: 'mita', name: 'Mita (m)' },
  { id: 'cm', name: 'Sentimita (cm)' },
  { id: 'futi', name: 'Futi (ft)' },
  { id: 'inchi', name: 'Inchi (inch)' },
  { id: 'dazeni', name: 'Dozen / Dazeni' },
  { id: 'pair', name: 'Pair / Jozi' },
  { id: 'set', name: 'Set / Seti' },
  { id: 'drum', name: 'Drum / Pipa' },
  { id: 'sheet', name: 'Sheet / Karatasi' },
  { id: 'plate', name: 'Plate / Bamba' },
  { id: 'bottle', name: 'Bottle / Chupa' },
  { id: 'tin', name: 'Tin / Kopo' },
  { id: 'bucket', name: 'Bucket / Ndoo' },
  { id: 'pallet', name: 'Pallet' },
]

// ============================================================
// SKU GENERATOR
// ============================================================
function generateSkuFor(jina: string, kundi: string): string {
  if (!jina.trim()) return ''

  const prefix =
    jina.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'SKU'

  const catPrefix =
    kundi.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'GN'

  const random = Math.random().toString(36).substring(2, 7).toUpperCase()
  const time = Date.now().toString(36).slice(-3).toUpperCase()

  return `${prefix}-${catPrefix}${time}${random}`
}

// ============================================================
// ERROR HELPER
// ============================================================
function getApiError(err: unknown, fallback: string): string {
  const error = err as {
    response?: {
      data?: Record<string, unknown> | string
    }
    message?: string
  }

  const data = error?.response?.data

  if (typeof data === 'string') return data

  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail

    const firstValue = Object.values(data)[0]

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0])
    }

    if (typeof firstValue === 'string') return firstValue
  }

  return error?.message || fallback
}

// ============================================================
// BULK ROW
// ============================================================
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

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function UingizaVifaa(_props: { role: 'mmiliki' | 'admin' }) {
  const { user } = useAuth()

  const [stores, setStores] = useState<StoreType[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'moja' | 'bulk' | 'historia'>('moja')
  const [selectedStoreId, setSelectedStoreId] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')

    try {
      const [storeData, movementData] = await Promise.all([
        storesApi.list(),
        inventoryApi.movements({ movement_type: 'manunuzi' }),
      ])

      setStores(storeData)
      setMovements(movementData)

      setSelectedStoreId(currentId => {
        if (currentId && storeData.some(s => s.id === currentId)) {
          return currentId
        }

        return storeData[0]?.id || ''
      })
    } catch (err: unknown) {
      setError(
        getApiError(
          err,
          'Imeshindikana kupata taarifa. Angalia muunganisho.'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // Load once when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedStore = useMemo(
    () => stores.find(s => s.id === selectedStoreId),
    [stores, selectedStoreId]
  )

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <PackagePlus size={26} className="text-brand-600" />
            Ingiza Vifaa
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ongeza bidhaa kwenye stoki ya duka
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={14}
            className={loading ? 'animate-spin' : ''}
          />
          Sasisha
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={load}
            className="text-xs underline"
          >
            Jaribu tena
          </button>
        </div>
      )}

      {/* STORE SELECTOR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <Store size={14} />
          Duka la Kuingiza
        </label>

        {loading ? (
          <SkeletonLine className="h-10 w-full mt-2" />
        ) : stores.length === 0 ? (
          <p className="mt-2 text-sm text-red-600">
            Hakuna maduka. Ongeza duka kwanza.
          </p>
        ) : (
          <select
            value={selectedStoreId}
            onChange={e => setSelectedStoreId(e.target.value)}
            className="mt-2 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white"
          >
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name} — {store.location}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* TABS */}
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

      {/* CONTENT */}
      {!loading && stores.length > 0 && (
        <>
          {tab === 'moja' && selectedStore && (
            <FomuMoja
              store={selectedStore}
              mtumiaji={user?.full_name || 'Mmiliki'}
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
            <Historia
              movements={movements}
              loading={loading}
            />
          )}
        </>
      )}
    </div>
  )
}

// ============================================================
// TAB BUTTON
// ============================================================
function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  Icon: ElementType
  label: string
}) {
  return (
    <button
      type="button"
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

// ============================================================
// FOMU MOJA
// ============================================================
function FomuMoja({
  store,
  mtumiaji,
  onSuccess,
}: {
  store: StoreType
  mtumiaji: string
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
    if (jina.trim()) {
      setSku(generateSkuFor(jina, categoryId))
    } else {
      setSku('')
    }
    // SKU hutengenezwa jina linapobadilika.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jina])

  const changeCategory = (value: string) => {
    setCategoryId(value)

    if (jina.trim()) {
      setSku(generateSkuFor(jina, value))
    }
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!jina.trim()) return setError('Jina la bidhaa linahitajika')
    if (!categoryId) return setError('Chagua kundi')
    if (!unitId) return setError('Chagua kipimo')
    if (beiMauzo <= 0) return setError('Bei ya mauzo si sahihi')
    if (beiUnunuzi <= 0) return setError('Bei ya ununuzi si sahihi')
    if (stoki <= 0) return setError('Stoki lazima iwe zaidi ya sifuri')

    const finalSku = sku || generateSkuFor(jina, categoryId)

    const categoryName =
      KUNDI_OPTIONS.find(c => c.id === categoryId)?.name || 'Nyingine'

    const unitName =
      KIPIMO_OPTIONS.find(u => u.id === unitId)?.name || 'Kipande'

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

      setSuccess(`Bidhaa "${product.name}" imeingizwa. SKU: ${finalSku}`)
      setJina('')
      setSku('')
      setCategoryId(KUNDI_OPTIONS[0].id)
      setUnitId(KIPIMO_OPTIONS[0].id)
      setBeiMauzo(0)
      setBeiUnunuzi(0)
      setStoki(0)

      window.setTimeout(() => {
        setSuccess('')
        onSuccess()
      }, 2000)
    } catch (err: unknown) {
      setError(getApiError(err, 'Imeshindikana kuunda bidhaa.'))
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
        <Store size={14} />
        Duka:
        <strong className="text-slate-800">{store.name}</strong>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Jina la Bidhaa *</label>
          <input
            value={jina}
            onChange={e => setJina(e.target.value)}
            placeholder="Mfano: Saruji Dangote 50kg"
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">SKU (Automatic)</label>
          <input
            value={sku}
            readOnly
            disabled
            placeholder="Itatengenezwa automatically"
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-sm font-mono cursor-not-allowed"
          />
          <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
            <Check size={11} />
            SKU hutengenezwa yenyewe
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Kundi *</label>
          <select
            value={categoryId}
            onChange={e => changeCategory(e.target.value)}
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white"
          >
            {KUNDI_OPTIONS.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Bei ya Mauzo (TZS) *
          </label>
          <input
            type="number"
            value={beiMauzo || ''}
            onChange={e => setBeiMauzo(Number(e.target.value))}
            min={0}
            placeholder="18500"
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Bei ya Ununuzi (TZS) *
          </label>
          <input
            type="number"
            value={beiUnunuzi || ''}
            onChange={e => setBeiUnunuzi(Number(e.target.value))}
            min={0}
            placeholder="16000"
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Kipimo *</label>
          <select
            value={unitId}
            onChange={e => setUnitId(e.target.value)}
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white"
          >
            {KIPIMO_OPTIONS.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Stoki *</label>
          <input
            type="number"
            value={stoki || ''}
            onChange={e => setStoki(Number(e.target.value))}
            min={1}
            placeholder="200"
            disabled={loading}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
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

// ============================================================
// FOMU BULK
// ============================================================
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

  const updateRow = (tempId: string, patch: Partial<BulkRow>) => {
    setRows(prev =>
      prev.map(r => r.tempId === tempId ? { ...r, ...patch } : r)
    )
  }

  const addRow = () => {
    setRows(prev => [...prev, newBulkRow()])
  }

  const removeRow = (tempId: string) => {
    setRows(prev =>
      prev.length === 1 ? prev : prev.filter(r => r.tempId !== tempId)
    )
  }

  const duplicateRow = (tempId: string) => {
    const row = rows.find(r => r.tempId === tempId)
    if (!row) return

    setRows(prev => [
      ...prev,
      {
        ...newBulkRow(),
        jina: row.jina,
        categoryId: row.categoryId,
        unitId: row.unitId,
        beiMauzo: row.beiMauzo,
        beiUnunuzi: row.beiUnunuzi,
        stoki: row.stoki,
        sku: row.jina.trim()
          ? generateSkuFor(row.jina, row.categoryId)
          : '',
      },
    ])
  }

  const rowErrors = (r: BulkRow): string[] => {
    const errors: string[] = []

    if (!r.jina.trim()) errors.push('Jina')
    if (r.beiMauzo <= 0) errors.push('Bei mauzo')
    if (r.beiUnunuzi <= 0) errors.push('Bei ununuzi')
    if (r.stoki <= 0) errors.push('Stoki')

    return errors
  }

  const validRows = rows.filter(r => rowErrors(r).length === 0)
  const invalidCount = rows.length - validRows.length

  const saveAll = async () => {
    if (!validRows.length || saving) return

    setSaving(true)
    setSummary(null)

    let ok = 0
    let fail = 0

    for (const row of rows) {
      if (rowErrors(row).length > 0) continue

      updateRow(row.tempId, {
        status: 'saving',
        error: undefined,
      })

      try {
        const categoryName =
          KUNDI_OPTIONS.find(c => c.id === row.categoryId)?.name || 'Nyingine'

        const unitName =
          KIPIMO_OPTIONS.find(u => u.id === row.unitId)?.name || 'Kipande'

        const finalSku =
          row.sku || generateSkuFor(row.jina, row.categoryId)

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
        })

        ok++
      } catch (err: unknown) {
        updateRow(row.tempId, {
          status: 'error',
          error: getApiError(err, 'Imeshindikana kuhifadhi bidhaa'),
        })

        fail++
      }
    }

    setSaving(false)
    setSummary({ ok, fail })

    if (ok > 0) {
      onSuccess()
    }
  }

  const resetAll = () => {
    if (saving) return

    if (!window.confirm('Una uhakika unataka kufuta mistari yote?')) {
      return
    }

    setRows([newBulkRow()])
    setSummary(null)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center">
          <Layers size={18} />
        </div>
        <div>
          <div className="font-semibold text-sm">
            Ingiza Bidhaa Nyingi
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ongeza bidhaa nyingi kisha bofya Hifadhi Zote. Duka:{' '}
            <strong>{store.name}</strong>
          </p>
        </div>
      </div>

      {summary && (
        <div className="p-3 rounded-lg text-sm border bg-emerald-50 border-emerald-200 text-emerald-800">
          {summary.ok} zimefanikiwa, {summary.fail} zimeshindikana.
          <button
            type="button"
            onClick={() => setSummary(null)}
            className="ml-3 underline"
          >
            Funga
          </button>
        </div>
      )}

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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 grid place-items-center text-xs font-bold">
                    {idx + 1}
                  </span>

                  {r.status === 'saving' && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Inahifadhi
                    </span>
                  )}

                  {r.status === 'ok' && (
                    <span className="text-xs text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Imehifadhiwa
                    </span>
                  )}

                  {r.status === 'error' && (
                    <span className="text-xs text-red-700 flex items-center gap-1">
                      <XCircle size={12} />
                      {r.error}
                    </span>
                  )}

                  {r.status === 'pending' && errs.length > 0 && (
                    <span className="text-xs text-amber-700">
                      {errs.join(', ')}
                    </span>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateRow(r.tempId)}
                    disabled={saving || r.status === 'ok'}
                    title="Nakili"
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                  >
                    <Copy size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeRow(r.tempId)}
                    disabled={saving || rows.length === 1 || r.status === 'ok'}
                    title="Ondoa"
                    className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-4">
                  <label className="text-[10px] font-medium block mb-1">
                    Jina *
                  </label>
                  <input
                    value={r.jina}
                    onChange={e => {
                      const jina = e.target.value

                      updateRow(r.tempId, {
                        jina,
                        sku: jina.trim()
                          ? generateSkuFor(jina, r.categoryId)
                          : '',
                      })
                    }}
                    placeholder="Saruji Dangote 50kg"
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-medium block mb-1">
                    SKU (Automatic)
                  </label>
                  <input
                    value={r.sku}
                    readOnly
                    disabled
                    placeholder="Itajitengeneza"
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 text-xs font-mono cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-medium block mb-1">
                    Kundi
                  </label>
                  <select
                    value={r.categoryId}
                    onChange={e => {
                      const categoryId = e.target.value

                      updateRow(r.tempId, {
                        categoryId,
                        sku: r.jina.trim()
                          ? generateSkuFor(r.jina, categoryId)
                          : '',
                      })
                    }}
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    {KUNDI_OPTIONS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="text-[10px] font-medium block mb-1">
                    Kipimo
                  </label>
                  <select
                    value={r.unitId}
                    onChange={e =>
                      updateRow(r.tempId, { unitId: e.target.value })
                    }
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                  >
                    {KIPIMO_OPTIONS.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="text-[10px] font-medium block mb-1">
                    Bei Mauzo *
                  </label>
                  <input
                    type="number"
                    value={r.beiMauzo || ''}
                    onChange={e =>
                      updateRow(r.tempId, {
                        beiMauzo: Number(e.target.value),
                      })
                    }
                    min={0}
                    placeholder="18500"
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium block mb-1">
                    Bei Ununuzi *
                  </label>
                  <input
                    type="number"
                    value={r.beiUnunuzi || ''}
                    onChange={e =>
                      updateRow(r.tempId, {
                        beiUnunuzi: Number(e.target.value),
                      })
                    }
                    min={0}
                    placeholder="16000"
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium block mb-1">
                    Stoki *
                  </label>
                  <input
                    type="number"
                    value={r.stoki || ''}
                    onChange={e =>
                      updateRow(r.tempId, {
                        stoki: Number(e.target.value),
                      })
                    }
                    min={1}
                    placeholder="200"
                    disabled={saving || r.status === 'ok'}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={addRow}
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold"
        >
          <Plus size={16} />
          Ongeza Mstari
        </button>

        <button
          type="button"
          onClick={resetAll}
          disabled={saving || rows.length === 1}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-sm font-semibold"
        >
          <Trash2 size={16} />
          Futa Yote
        </button>

        <button
          type="button"
          onClick={saveAll}
          disabled={saving || validRows.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Inahifadhi...
            </>
          ) : (
            <>
              <Save size={16} />
              Hifadhi Zote ({validRows.length})
            </>
          )}
        </button>
      </div>

      {invalidCount > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          Mistari {invalidCount} haina taarifa kamili na itarukwa.
        </div>
      )}
    </div>
  )
}

// ============================================================
// HISTORIA
// ============================================================
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

    return movements.filter(m =>
      (m.product_name || '').toLowerCase().includes(query) ||
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
            onChange={e => setQ(e.target.value)}
            placeholder="Tafuta bidhaa..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border p-4"
            >
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-3 w-24 mt-2" />
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
          {filtered.map(m => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-50 border grid place-items-center text-emerald-600 shrink-0">
                <CheckCircle2 size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">
                  {m.product_name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {m.store_name} — {m.note || '—'}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(m.created_at)} — {m.created_by_name}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-emerald-700">
                  +{Number(m.quantity).toLocaleString()}
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
