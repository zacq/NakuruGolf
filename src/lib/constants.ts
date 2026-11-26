export const CLUB = {
  name: "Nakuru Golf Club",
  phone: "+254704231641",
  phoneDisplay: "+254 704 231 641",
  whatsapp: "254704231641",
  email: "info@nakurugolfclub.co.ke",
  address: "Behind Nakuru Show Ground, along Showground Road, Nakuru, Kenya",
  hours: "Reception 7:00am – 7:00pm daily · Course 6:00am – 6:30pm",
  mapQuery: "Nakuru Golf Club, Showground Road, Nakuru",
  url: process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://nakurugolfclub.co.ke",
};

// WhatsApp channel invite, e.g. https://whatsapp.com/channel/...
export const WA_CHANNEL = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || "";

export const PAYBILL = process.env.NEXT_PUBLIC_MPESA_PAYBILL || "";

export const SOCIALS = [
  ["Facebook", process.env.NEXT_PUBLIC_FACEBOOK_URL],
  ["Instagram", process.env.NEXT_PUBLIC_INSTAGRAM_URL],
  ["X", process.env.NEXT_PUBLIC_X_URL],
].filter((x): x is [string, string] => !!x[1]);

export const px = (id: number, w = 900) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${Math.round(w * 0.62)}`;

export const IMG = {
  hero: px(6256755, 1400),
  course: px(6256754, 1000),
  mower: px(27309420, 1000),
  rooms: [px(189293), px(6394574), px(2736388), px(10660270)],
  food: [px(7627408), px(5491046), px(8194817)],
  wash: [px(6873174), px(6872591), px(4870702)],
  golf: [px(40647238), px(11482677), px(15877158), px(5644641), px(3414145)],
};

export const STREAMS: Record<string, string> = {
  events: "Event entries",
  tickets: "Tickets (dinner, spectator)",
  merchandise: "Merchandise",
  rooms: "Rooms",
  meals: "Meals & dining",
  carwash: "Car wash",
  greenfees: "Green fees & golf extras",
  lessons: "Lessons",
  membership: "Membership",
  ballot: "Tee-time draw fees",
  venue: "Venue hire",
  sponsorship: "Sponsorship",
};

export const EVENT_TYPES: Record<string, string> = {
  club: "Club competitions",
  corporate: "Corporate golf days",
  open: "Opens & invitationals",
  "junior-ladies": "Junior & ladies",
  social: "Social events",
};

export const TIERS: Record<string, string> = {
  platinum: "Platinum Partners",
  gold: "Gold Partners",
  silver: "Silver Partners",
  event: "Event Partners",
  community: "Community Partners",
};

export const SPONSOR_ROLES: Record<string, string> = {
  title: "Title sponsor",
  hole: "Hole sponsor",
  prize: "Prize sponsor",
  hospitality: "Hospitality partner",
  media: "Media partner",
  annual: "Annual club partner",
};

export const PROMO_CODES: Record<string, { pct: number; label: string }> = {
  NAKURU10: { pct: 10, label: "10% off" },
  MEMBER5: { pct: 5, label: "5% member code" },
};

export const DEPOSIT_PCT = 30;

export const TZ = "Africa/Nairobi";

export const kes = (n: number) => `KSh ${Math.round(n).toLocaleString("en-KE")}`;

export function fmtDate(d: Date | string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString("en-KE", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opts,
  });
}

export function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-KE", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function eventDates(start: Date | string, end: Date | string) {
  const s = new Date(start);
  const e = new Date(end);
  const sd = fmtDate(s, { year: undefined });
  const ed = fmtDate(e, { year: undefined });
  const y = fmtDate(e, { day: undefined, month: undefined });
  return sd === ed ? `${sd} ${y}` : `${sd} – ${ed} ${y}`;
}

export type EventStatus = "upcoming" | "ongoing" | "past";
export function eventStatus(e: { startsAt: Date; endsAt: Date }, now = new Date()): EventStatus {
  if (now < new Date(e.startsAt)) return "upcoming";
  if (now <= new Date(e.endsAt)) return "ongoing";
  return "past";
}

export function waLink(message: string, number = CLUB.whatsapp) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function normalizePhone(raw: string) {
  const d = raw.replace(/[^0-9]/g, "");
  if (d.startsWith("254") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 10) return "254" + d.slice(1);
  if (d.length === 9 && /^[17]/.test(d)) return "254" + d;
  return "";
}

export function isWeekend(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z").getUTCDay();
  return d === 0 || d === 6;
}

export const COURSE_NOTE_DEFAULT =
  "Course open. Greens in good condition; buggies on cart paths only after rain.";

// Placeholder hole data - the club supplies the final yardages, tips and photos via the CMS.
export const HOLES = Array.from({ length: 18 }, (_, i) => {
  const pars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4];
  const yards = [372, 395, 168, 508, 410, 355, 182, 520, 388, 380, 402, 175, 530, 365, 158, 420, 515, 398];
  const tips = [
    "Gentle opener: favour the left half of the fairway.",
    "Bunker guards the right side of the green.",
    "Check the wind, club up if it is into your face.",
    "Reachable in two for long hitters, lay up short of the ditch otherwise.",
    "Long par four; an accurate drive sets up the approach.",
    "Keep the ball below the hole on this sloping green.",
    "Short but demanding: miss on the safe side.",
    "Three-shot hole for most; position is everything.",
    "Aim at the clubhouse tower from the tee.",
    "Fairway narrows at landing zone.",
    "Slight dog-leg right; take less club off the tee.",
    "Elevated green, add a club.",
    "Longest hole on the course; plan your layup.",
    "Trees left, bunkers right: pick your miss.",
    "Pin position decides the club here.",
    "Big drive needed to clear the rise.",
    "Finishing par five: birdie chance for the brave.",
    "Home straight: a solid par wins matches.",
  ];
  return { hole: i + 1, par: pars[i], yards: yards[i], tip: tips[i] };
});

export const SHIRT_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];
