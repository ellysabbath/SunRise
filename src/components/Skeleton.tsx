export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`bg-slate-200 rounded animate-pulse ${className}`} />
}

export function SkeletonProductCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-slate-200 animate-pulse" />
        <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
      </div>
      <SkeletonLine className="h-4 w-3/4 mt-3" />
      <SkeletonLine className="h-3 w-1/2 mt-1.5" />
      <SkeletonLine className="h-5 w-1/3 mt-2" />
      <SkeletonLine className="h-3 w-2/5 mt-1.5" />
    </div>
  )
}

export function SkeletonSelect() {
  return (
    <div className="space-y-2">
      <SkeletonLine className="h-3 w-16" />
      <div className="h-10 rounded-lg bg-slate-200 animate-pulse" />
    </div>
  )
}

export function SkeletonCartItem() {
  return (
    <div className="py-3">
      <div className="flex justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <SkeletonLine className="h-4 w-3/4" />
          <SkeletonLine className="h-3 w-1/3" />
        </div>
        <SkeletonLine className="h-4 w-16" />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-7 h-7 rounded-lg bg-slate-200 animate-pulse" />
        <SkeletonLine className="h-4 w-6" />
        <div className="w-7 h-7 rounded-lg bg-slate-200 animate-pulse" />
      </div>
    </div>
  )
}