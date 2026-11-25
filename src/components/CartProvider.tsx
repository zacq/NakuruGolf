"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { CartItem } from "@/lib/types";

type Ctx = {
  items: CartItem[];
  count: number;
  hydrated: boolean;
  add: (item: Omit<CartItem, "id">) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "ngc_cart_v1";

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("CartProvider missing");
  return c;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const add = useCallback((item: Omit<CartItem, "id">) => {
    setItems((prev) => [...prev, { ...item, id: Math.random().toString(36).slice(2) }]);
    setToast(`${item.label} added to cart`);
  }, []);
  const remove = useCallback((id: string) => setItems((p) => p.filter((i) => i.id !== id)), []);
  const setQty = useCallback(
    (id: string, qty: number) => setItems((p) => p.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(50, qty)) } : i))),
    [],
  );
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.reduce((a, i) => a + (i.kind === "room" ? 1 : i.qty), 0), hydrated, add, remove, setQty, clear }),
    [items, hydrated, add, remove, setQty, clear],
  );

  return (
    <CartCtx.Provider value={value}>
      {children}
      {toast && (
        <div role="status" className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-fairway-900 px-4 py-3 text-sm text-white shadow-xl md:bottom-6">
          <span className="line-clamp-2">{toast}</span>
          <Link href="/cart" className="shrink-0 rounded-lg bg-gold-500 px-3 py-2 font-bold text-fairway-900">
            View cart
          </Link>
        </div>
      )}
    </CartCtx.Provider>
  );
}
