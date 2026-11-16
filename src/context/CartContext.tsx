import { createContext, useContext, useState, type ReactNode } from "react";

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

interface CartContextValue {
  detailed: CartItem[];
  count: number;
  total: number;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  add: (item: Omit<CartItem, "jumla">) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add: CartContextValue["add"] = (item) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, wingi: i.wingi + item.wingi, jumla: (i.wingi + item.wingi) * i.bei }
            : i
        );
      }
      return [...prev, { ...item, jumla: item.wingi * item.bei }];
    });
  };

  const inc = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, wingi: i.wingi + 1, jumla: (i.wingi + 1) * i.bei } : i
      )
    );
  };

  const dec = (id: string) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, wingi: i.wingi - 1, jumla: (i.wingi - 1) * i.bei } : i
        )
        .filter((i) => i.wingi > 0)
    );
  };

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.wingi, 0);
  const total = items.reduce((s, i) => s + i.jumla, 0);

  return (
    <CartContext.Provider value={{ detailed: items, count, total, add, inc, dec, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}