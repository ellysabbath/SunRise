import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "../lib/firebase";

export function useRealtime<T = any>(path: string) {
  const [data, setData] = useState<Record<string, T> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(rtdb, path);
    const unsub = onValue(r, (snap) => {
      setData(snap.val());
      setLoading(false);
    });
    return () => unsub();
  }, [path]);

  return { data, loading };
}

/** Convert Firebase dict → array yenye id */
export function toList<T extends { id?: string }>(obj: Record<string, T> | null): (T & { id: string })[] {
  if (!obj) return [];
  return Object.entries(obj).map(([id, v]) => ({ ...(v as T), id }));
}