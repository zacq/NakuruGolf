import type { Metadata } from "next";
import CartPage from "@/components/CartPage";

export const metadata: Metadata = { title: "Your cart & checkout", robots: { index: false } };

export default function Cart() {
  return <CartPage />;
}
