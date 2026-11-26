export type CartItem = {
  id: string;
  kind: "entry" | "room" | "menu" | "carwash" | "product" | "lesson" | "greenfee" | "membership" | "ballot";
  refId: number;
  qty: number;
  eventId?: number | null;
  meta: Record<string, unknown>;
  label: string; // display name
  detail?: string; // display detail line
  unitPrice: number; // display price (non-member) per unit
};

export type QuoteLine = {
  kind: string;
  itemName: string;
  qty: number;
  unitPrice: number;
  total: number;
  balance: number;
  stream: string;
  eventId: number | null;
};

export type Quote = {
  ok: boolean;
  error?: string;
  lines: QuoteLine[];
  subtotal: number;
  discount: number;
  total: number;
  amountDue: number;
  balance: number;
  member: boolean;
  promoLabel?: string;
};
