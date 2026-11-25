import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull().default(""),
  email: text("email").default(""),
  company: text("company").default(""),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(), // club | corporate | open | junior-ladies | social
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  venue: text("venue").notNull().default("Nakuru Golf Club"),
  format: text("format").notNull().default(""),
  summary: text("summary").notNull().default(""),
  description: text("description").notNull().default(""),
  schedule: text("schedule").notNull().default(""),
  rules: text("rules").notNull().default(""),
  prizes: text("prizes").notNull().default(""),
  dressCode: text("dress_code").notNull().default(""),
  contact: text("contact").notNull().default(""),
  banner: text("banner").default(""),
  capacity: integer("capacity").notNull().default(100),
  titleSponsor: text("title_sponsor").default(""),
  results: text("results").default(""),
  featured: boolean("featured").notNull().default(false),
});

export const entryTypes = pgTable("entry_types", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  kind: text("kind").notNull().default("entry"), // entry | ticket
  name: text("name").notNull(),
  description: text("description").default(""),
  price: integer("price").notNull(),
  priceMember: integer("price_member"),
  players: integer("players").notNull().default(1),
  cap: integer("cap"),
  sold: integer("sold").notNull().default(0),
  deadline: timestamp("deadline", { withTimezone: true }),
});

export const roomTypes = pgTable("room_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  beds: text("beds").default(""),
  capacity: integer("capacity").notNull().default(2),
  amenities: text("amenities").default(""),
  rate: integer("rate").notNull(),
  memberRate: integer("member_rate"),
  corporateRate: integer("corporate_rate"),
  eventRate: integer("event_rate"),
  image: text("image").default(""),
  totalRooms: integer("total_rooms").notNull().default(5),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // breakfast | lunch | dinner | snacks
  name: text("name").notNull(),
  description: text("description").default(""),
  price: integer("price").notNull(),
  memberPrice: integer("member_price"),
  available: boolean("available").notNull().default(true),
});

export const carWashServices = pgTable("car_wash_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  price: integer("price").notNull(),
  durationMins: integer("duration_mins").notNull().default(30),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  category: text("category").notNull().default("merch"), // merch | golf
  name: text("name").notNull(),
  description: text("description").default(""),
  price: integer("price").notNull(),
  bundlePrice: integer("bundle_price"),
  stock: integer("stock"), // null = unlimited
  sizes: text("sizes").default(""),
  image: text("image").default(""),
  eventId: integer("event_id"),
});

export const greenFees = pgTable("green_fees", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  weekday9: integer("weekday_9").notNull(),
  weekday18: integer("weekday_18").notNull(),
  weekend9: integer("weekend_9").notNull(),
  weekend18: integer("weekend_18").notNull(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("private"),
  coach: text("coach").default("Club Professional"),
  description: text("description").default(""),
  price: integer("price").notNull(),
});

export const membershipCategories = pgTable("membership_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  benefits: text("benefits").default(""),
  joiningFee: integer("joining_fee").notNull(),
  annualFee: integer("annual_fee").notNull(),
});

export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").default(""),
  idNumber: text("id_number").default(""),
  proposer: text("proposer").default(""),
  seconder: text("seconder").default(""),
  documents: text("documents").default(""),
  consent: boolean("consent").notNull().default(false),
  status: text("status").notNull().default("received"), // received | under_review | approved | active | lapsed | declined
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  renewalDue: timestamp("renewal_due", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tier: text("tier").notNull(), // platinum | gold | silver | event | community
  description: text("description").default(""),
  story: text("story").default(""),
  website: text("website").default(""),
  years: text("years").default(""),
  color: text("color").default("#0f3d2e"),
  logo: text("logo").default(""),
});

export const sponsorships = pgTable("sponsorships", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").notNull(),
  eventId: integer("event_id"),
  role: text("role").notNull(), // title | hole | prize | hospitality | media | annual
  value: integer("value").notNull().default(0),
  contractStart: timestamp("contract_start", { withTimezone: true }).defaultNow(),
  contractEnd: timestamp("contract_end", { withTimezone: true }),
});

export const sponsorPackages = pgTable("sponsor_packages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  benefits: text("benefits").default(""),
  price: integer("price"),
});

export const manualIncome = pgTable("manual_income", {
  id: serial("id").primaryKey(),
  stream: text("stream").notNull(), // venue | sponsorship | ...
  description: text("description").notNull(),
  amount: integer("amount").notNull(),
  eventId: integer("event_id"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsPosts = pgTable("news_posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(), // club | tournaments | course | members
  image: text("image").default(""),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});

export const galleryPhotos = pgTable("gallery_photos", {
  id: serial("id").primaryKey(),
  album: text("album").notNull(),
  url: text("url").notNull(),
  caption: text("caption").default(""),
  eventId: integer("event_id"),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // venue | sponsorship | catering | general
  name: text("name").notNull(),
  company: text("company").default(""),
  phone: text("phone").default(""),
  email: text("email").default(""),
  details: jsonb("details").$type<Record<string, string>>().default({}),
  status: text("status").notNull().default("new"), // new | contacted | won | lost
  owner: text("owner").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull().unique(),
    customerId: integer("customer_id"),
    customerName: text("customer_name").notNull().default(""),
    phone: text("phone").notNull(),
    email: text("email").default(""),
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull().default(0),
    amountDue: integer("amount_due").notNull().default(0), // charged now (total less balance)
    balance: integer("balance").notNull().default(0), // due at check-in
    status: text("status").notNull().default("pending"), // pending | paid | failed | cancelled | refunded
    source: text("source").notNull().default("web"), // web | whatsapp | staff
    promoCode: text("promo_code").default(""),
    poRef: text("po_ref").default(""),
    isMember: boolean("is_member").notNull().default(false),
    refundReason: text("refund_reason").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [index("orders_phone_idx").on(t.phone), index("orders_status_idx").on(t.status)],
);

export const orderLines = pgTable(
  "order_lines",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull(),
    kind: text("kind").notNull(),
    refId: integer("ref_id"),
    stream: text("stream").notNull(),
    itemName: text("item_name").notNull(),
    qty: integer("qty").notNull().default(1),
    unitPrice: integer("unit_price").notNull().default(0),
    total: integer("total").notNull().default(0),
    balance: integer("balance").notNull().default(0),
    eventId: integer("event_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
  },
  (t) => [index("order_lines_order_idx").on(t.orderId), index("order_lines_event_idx").on(t.eventId)],
);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  method: text("method").notNull().default("mpesa"),
  mpesaReceipt: text("mpesa_receipt"),
  checkoutRequestId: text("checkout_request_id"),
  phone: text("phone").default(""),
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending | success | failed
  mode: text("mode").notNull().default("demo"), // demo | live
  reconciledAt: timestamp("reconciled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  orderLineId: integer("order_line_id").notNull(),
  orderId: integer("order_id").notNull(),
  eventId: integer("event_id").notNull(),
  entryTypeId: integer("entry_type_id").notNull(),
  holderName: text("holder_name").notNull().default(""),
  players: jsonb("players").$type<Record<string, string>[]>().default([]),
  club: text("club").default(""),
  shirtSize: text("shirt_size").default(""),
  dietary: text("dietary").default(""),
  qrCode: text("qr_code").notNull().unique(),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
});

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    orderLineId: integer("order_line_id"),
    orderId: integer("order_id"),
    kind: text("kind").notNull(), // room | carwash | table | meal | teetime | lesson
    refId: integer("ref_id"),
    label: text("label").notNull().default(""),
    date: text("date").notNull().default(""),
    endDate: text("end_date").default(""),
    time: text("time").default(""),
    qty: integer("qty").notNull().default(1),
    guests: integer("guests").notNull().default(1),
    status: text("status").notNull().default("held"), // held | requested | confirmed | completed | cancelled
    holdExpires: timestamp("hold_expires", { withTimezone: true }),
    name: text("name").default(""),
    phone: text("phone").default(""),
    source: text("source").notNull().default("web"),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_kind_date_idx").on(t.kind, t.date)],
);

export const otps = pgTable("otps", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull(), // sms | email | whatsapp
  recipient: text("recipient").notNull(),
  body: text("body").notNull(),
  orderNumber: text("order_number"),
  dedupeKey: text("dedupe_key").unique(),
  status: text("status").notNull().default("queued"), // queued | sent
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull().default("staff"),
  action: text("action").notNull(),
  detail: text("detail").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
