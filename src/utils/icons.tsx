import {
  Package, Layers, Home, PaintBucket, Wrench, Zap, Droplet, Box,
} from 'lucide-react'
import type { KundiBidhaa } from '../types'

const ICONS: Record<KundiBidhaa, React.ElementType> = {
  Saruji: Package,
  Nondo: Layers,
  Mabati: Home,
  Mbao: Layers,
  Rangi: PaintBucket,
  Bomba: Droplet,
  Umeme: Zap,
  Zana: Wrench,
}

// ✅ Kubali string yoyote — itumike kwa data za API ambazo hazina type
export function iconForKundi(kundi?: string | KundiBidhaa | null): React.ElementType {
  if (!kundi) return Box
  return ICONS[kundi as KundiBidhaa] ?? Box
}