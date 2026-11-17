import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ==================================================================
// Types
// ==================================================================
interface CartItem {
  id: string;
  jina: string;
  bei: number;
  wingi: number;
  uom: string;
  jumla: number;
  iconKey?: string;
  pichaUrl?: string;
}

type AddItemPayload = Omit<CartItem, "jumla" | "wingi"> & { wingi?: number };

interface CartContextValue {
  detailed: CartItem[];
  count: number;
  total: number;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  add: (item: AddItemPayload) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "cart_items";

// ==================================================================
// Provider
// ==================================================================
export function CartProvider({ children }: { children: ReactNode }) {
  // ✅ Load kutoka localStorage mwanzoni
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // ✅ Save kwenye localStorage kila items inabadilika
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  // ------------------------------------------------------------------
  // Add
  // ------------------------------------------------------------------
  const add = useCallback<CartContextValue["add"]>((item) => {
    const qty = item.wingi ?? 1;

    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                wingi: i.wingi + qty,
                jumla: (i.wingi + qty) * i.bei,
              }
            : i
        );
      }
      return [
        ...prev,
        { ...item, wingi: qty, jumla: qty * item.bei } as CartItem,
      ];
    });
  }, []);

  // ------------------------------------------------------------------
  // Inc
  // ------------------------------------------------------------------
  const inc = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, wingi: i.wingi + 1, jumla: (i.wingi + 1) * i.bei }
          : i
      )
    );
  }, []);

  // ------------------------------------------------------------------
  // Dec
  // ------------------------------------------------------------------
  const dec = useCallback((id: string) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.id === id
            ? { ...i, wingi: i.wingi - 1, jumla: (i.wingi - 1) * i.bei }
            : i
        )
        .filter((i) => i.wingi > 0)
    );
  }, []);

  // ------------------------------------------------------------------
  // Remove
  // ------------------------------------------------------------------
  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  // ------------------------------------------------------------------
  // Clear
  // ------------------------------------------------------------------
  const clear = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // ------------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------------
  const count = items.reduce((s, i) => s + i.wingi, 0);
  const total = items.reduce((s, i) => s + i.jumla, 0);

  return (
    <CartContext.Provider
      value={{ detailed: items, count, total, add, inc, dec, remove, clear }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ==================================================================
// Hook
// ==================================================================
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}