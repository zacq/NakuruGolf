import { db } from "@/db";
import { sql, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { IMG, COURSE_NOTE_DEFAULT } from "./constants";

let seeding: Promise<void> | null = null;

export function ensureSeed() {
  if (!seeding) {
    seeding = runSeed().catch((e) => {
      seeding = null;
      throw e;
    });
  }
  return seeding;
}

const d = (iso: string) => new Date(iso);

async function runSeed() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(424242)`);
    const done = await tx.select().from(s.settings).where(eq(s.settings.key, "seeded"));
    if (done.length) return;

    // ---------- Events ----------
    const [kengen, open, ladies, junior, charity, medal, challenge] = await tx
      .insert(s.events)
      .values([
        {
          slug: "kengen-golf-day-2026",
          name: "KenGen Golf Day 2026",
          type: "corporate",
          startsAt: d("2026-11-27T07:00:00+03:00"),
          endsAt: d("2026-11-28T18:00:00+03:00"),
          format: "Stableford · Fourball better-ball",
          summary: "Two days of corporate golf at Nakuru Golf Club with KCB and Kaishan as partners.",
          description:
            "The KenGen Golf Day returns to Nakuru Golf Club for two days of competitive corporate golf, networking and a gala dinner. Register individually or as a fourball, then add rooms, dinner, a car wash and branded merchandise in the same checkout.",
          schedule:
            "Fri 27 Nov: 6:30am registration & breakfast · 7:30am shotgun start · 1:00pm lunch · 7:00pm welcome drinks\nSat 28 Nov: 7:00am tee-off · 2:00pm lunch · 6:30pm gala dinner & prize-giving",
          rules:
            "Stableford scoring, 3/4 handicap allowance for fourballs. Handicaps are self-declared and may be verified. Local rules are on the scorecard.",
          prizes: "Overall winners, best lady, best corporate team, nearest-the-pin, longest drive, lucky draw.",
          dressCode: "Collared golf shirt, tailored shorts or trousers, soft-spiked golf shoes. No jeans.",
          contact: "Club Captain via reception · +254 704 231 641",
          capacity: 144,
          titleSponsor: "KenGen",
          featured: true,
        },
        {
          slug: "nakuru-open-2027",
          name: "Nakuru Open 2027",
          type: "open",
          startsAt: d("2027-02-20T07:00:00+03:00"),
          endsAt: d("2027-02-21T17:00:00+03:00"),
          format: "36 holes stroke play · Gross & Nett",
          summary: "The club's annual open invitational for amateurs from across Kenya.",
          description:
            "Open to all amateur golfers with a valid handicap. Two rounds of stroke play with gross and nett divisions.",
          schedule: "Sat: 7:00am first tee · Sun: 7:30am final round · 4:00pm prize-giving",
          rules: "R&A rules apply. Handicap certificates may be requested.",
          prizes: "Gross & nett trophies, category prizes.",
          dressCode: "Standard golf attire.",
          contact: "Club Secretary via reception",
          capacity: 120,
          titleSponsor: "",
        },
        {
          slug: "ladies-captains-prize-2027",
          name: "Ladies' Captain's Prize 2027",
          type: "junior-ladies",
          startsAt: d("2027-03-13T08:00:00+03:00"),
          endsAt: d("2027-03-13T16:00:00+03:00"),
          format: "18 holes Stableford",
          summary: "A day of ladies' golf, lunch and prize-giving.",
          description: "The annual Ladies' Captain's Prize with lunch and prize-giving for members and guests.",
          schedule: "8:00am tee-off · 1:00pm lunch · 3:00pm prize-giving",
          rules: "Stableford, full handicap.",
          prizes: "Division winners and spot prizes.",
          dressCode: "Golf attire.",
          contact: "Lady Captain via reception",
          capacity: 60,
        },
        {
          slug: "junior-golf-clinic-2027",
          name: "Junior Golf Clinic & Tournament",
          type: "junior-ladies",
          startsAt: d("2027-04-10T08:00:00+03:00"),
          endsAt: d("2027-04-10T15:00:00+03:00"),
          format: "Clinic + 9-hole junior competition",
          summary: "Coaching and a nine-hole competition for young golfers.",
          description: "A fun day for juniors aged 8–17 with coaching in the morning and a nine-hole competition after lunch.",
          schedule: "8:00am clinic · 11:30am lunch · 12:30pm 9-hole competition",
          rules: "Parent or guardian consent required.",
          prizes: "Medals for age groups.",
          dressCode: "Smart-casual sportswear.",
          contact: "Club Professional via reception",
          capacity: 40,
        },
        {
          slug: "captains-charity-fun-day-2027",
          name: "Captain's Charity Fun Day",
          type: "social",
          startsAt: d("2027-05-22T09:00:00+03:00"),
          endsAt: d("2027-05-22T18:00:00+03:00"),
          format: "Scramble · BBQ · family day",
          summary: "A relaxed scramble and family BBQ in aid of a local charity.",
          description: "Teams of four play a fun scramble; non-golfers are welcome for the BBQ and entertainment.",
          schedule: "9:00am scramble · 1:00pm BBQ · 4:00pm prize-giving",
          rules: "Scramble format; all abilities.",
          prizes: "Best team, best-dressed team.",
          dressCode: "Fun and colourful.",
          contact: "Club Captain via reception",
          capacity: 100,
        },
        {
          slug: "october-monthly-medal-2026",
          name: "October Monthly Medal 2026",
          type: "club",
          startsAt: d("2026-10-10T07:30:00+03:00"),
          endsAt: d("2026-10-10T16:00:00+03:00"),
          format: "18 holes Stableford",
          summary: "The club's monthly medal for members.",
          description: "Monthly medal competition for members and guests.",
          schedule: "7:30am start",
          rules: "Stableford.",
          prizes: "Division trophies.",
          dressCode: "Golf attire.",
          contact: "Handicap Secretary via reception",
          capacity: 80,
          results:
            "Division 1 winner: 39 points. Division 2 winner: 41 points. Nearest the pin (hole 7): 1.2 m. Full results are available from the Handicap Secretary.",
        },
        {
          slug: "nakuru-corporate-challenge-2026",
          name: "Nakuru Corporate Challenge 2026",
          type: "corporate",
          startsAt: d("2026-09-18T07:00:00+03:00"),
          endsAt: d("2026-09-18T18:00:00+03:00"),
          format: "Fourball better-ball Stableford",
          summary: "A one-day corporate challenge between Nakuru businesses.",
          description: "Corporate teams competed for the challenge trophy with a dinner and prize-giving.",
          schedule: "7:30am shotgun · 6:00pm dinner",
          rules: "Stableford.",
          prizes: "Challenge trophy and team prizes.",
          dressCode: "Golf attire.",
          contact: "Club Captain via reception",
          capacity: 96,
          results: "Thank you to all teams and partners who joined us. Photos are in the gallery.",
        },
      ])
      .returning();

    await tx.insert(s.entryTypes).values([
      { eventId: kengen.id, kind: "entry", name: "Individual entry", description: "Includes green fee, breakfast and lunch", price: 8000, priceMember: 6500, players: 1, cap: 100, deadline: d("2026-11-26T18:00:00+03:00") },
      { eventId: kengen.id, kind: "entry", name: "Corporate fourball", description: "Four players, branded team signage, one team photo", price: 30000, priceMember: 26000, players: 4, cap: 20, deadline: d("2026-11-25T18:00:00+03:00") },
      { eventId: kengen.id, kind: "entry", name: "Early-bird individual", description: "Discounted entry, closed 20 Nov", price: 6500, priceMember: 6000, players: 1, cap: 20, deadline: d("2026-11-20T18:00:00+03:00") },
      { eventId: kengen.id, kind: "ticket", name: "Gala dinner & prize-giving", description: "Sat 28 Nov, three-course dinner", price: 3500, priceMember: 3000, players: 1, cap: 200 },
      { eventId: kengen.id, kind: "ticket", name: "Spectator pass", description: "Access to the course and clubhouse for the day", price: 500, priceMember: 500, players: 1, cap: 150 },
      { eventId: kengen.id, kind: "ticket", name: "Hospitality tent (per guest)", description: "Seated lunch and refreshments on the 18th", price: 6000, priceMember: 5500, players: 1, cap: 60 },
      { eventId: open.id, kind: "entry", name: "Individual entry (36 holes)", description: "Two rounds, lunch both days", price: 9000, priceMember: 7500, players: 1, cap: 100, deadline: d("2027-02-15T18:00:00+03:00") },
      { eventId: open.id, kind: "ticket", name: "Prize-giving dinner", description: "Sunday evening dinner", price: 3000, priceMember: 2500, players: 1, cap: 150 },
      { eventId: ladies.id, kind: "entry", name: "Individual entry", price: 5000, priceMember: 3500, players: 1, cap: 60 },
      { eventId: junior.id, kind: "entry", name: "Junior entry", description: "Clinic, lunch and competition", price: 1500, priceMember: 1000, players: 1, cap: 40 },
      { eventId: charity.id, kind: "entry", name: "Scramble team of four", price: 16000, priceMember: 14000, players: 4, cap: 20 },
      { eventId: charity.id, kind: "ticket", name: "BBQ ticket (non-golfer)", price: 1800, priceMember: 1500, players: 1, cap: 100 },
    ]);

    // ---------- Products ----------
    await tx.insert(s.products).values([
      { category: "merch", name: "KenGen Golf Day polo shirt", description: "Event-branded performance polo", price: 2200, bundlePrice: 1800, stock: 120, sizes: "S,M,L,XL,XXL,3XL", eventId: kengen.id, image: IMG.golf[1] },
      { category: "merch", name: "KenGen Golf Day cap", description: "Embroidered event cap", price: 900, stock: 150, sizes: "", eventId: kengen.id, image: IMG.golf[3] },
      { category: "merch", name: "Event golf balls (sleeve of 3)", description: "Branded for the KenGen Golf Day", price: 1200, stock: 200, sizes: "", eventId: kengen.id, image: IMG.golf[2] },
      { category: "merch", name: "Nakuru Golf Club polo", description: "Club crest polo shirt", price: 2500, stock: 60, sizes: "S,M,L,XL,XXL", image: IMG.golf[0] },
      { category: "merch", name: "Club crest cap", description: "Cotton twill cap, adjustable", price: 1000, stock: 80, sizes: "", image: IMG.golf[4] },
      { category: "merch", name: "Golf umbrella", description: "Windproof 62-inch umbrella", price: 1800, stock: 25, sizes: "", image: IMG.course },
      { category: "golf", name: "Caddie (18 holes)", description: "Caddie service for one round", price: 1000 },
      { category: "golf", name: "Club hire (full set)", description: "Half-set or full set per round", price: 2000 },
      { category: "golf", name: "Buggy hire (18 holes)", description: "Subject to availability", price: 3500 },
      { category: "golf", name: "Range balls (bucket)", description: "Practice range bucket", price: 400 },
    ]);

    // ---------- Rooms ----------
    await tx.insert(s.roomTypes).values([
      { name: "Standard Single", description: "Quiet single room overlooking the gardens.", beds: "1 single bed", capacity: 1, amenities: "Wi-Fi, TV, hot shower, breakfast option", rate: 4500, memberRate: 4000, corporateRate: 4000, eventRate: 5500, image: IMG.rooms[0], totalRooms: 8 },
      { name: "Standard Double", description: "Comfortable double room for couples or friends.", beds: "1 double bed", capacity: 2, amenities: "Wi-Fi, TV, hot shower, tea & coffee", rate: 6000, memberRate: 5400, corporateRate: 5400, eventRate: 7500, image: IMG.rooms[1], totalRooms: 10 },
      { name: "Executive Twin", description: "Spacious room with twin beds and a work desk.", beds: "2 single beds", capacity: 2, amenities: "Wi-Fi, TV, desk, tea & coffee, breakfast option", rate: 7500, memberRate: 6800, corporateRate: 6800, eventRate: 9000, image: IMG.rooms[2], totalRooms: 6 },
      { name: "Family Room", description: "Room for up to four with a double and two singles.", beds: "1 double + 2 single", capacity: 4, amenities: "Wi-Fi, TV, hot shower, extra space", rate: 10000, memberRate: 9000, corporateRate: 9000, eventRate: 12000, image: IMG.rooms[3], totalRooms: 3 },
    ]);

    // ---------- Menu ----------
    await tx.insert(s.menuItems).values([
      { category: "breakfast", name: "Full English breakfast", description: "Eggs, sausage, bacon, toast, tea or coffee", price: 1200 },
      { category: "breakfast", name: "Continental breakfast", description: "Pastries, fruit, yoghurt, tea or coffee", price: 900 },
      { category: "lunch", name: "Grilled chicken & chips", description: "Half chicken, fries, kachumbari", price: 1400 },
      { category: "lunch", name: "Beef burger & fries", description: "Grass-fed beef, cheddar, fries", price: 1300 },
      { category: "lunch", name: "Nyama choma platter", description: "Goat or beef, ugali, kachumbari", price: 1800 },
      { category: "lunch", name: "After-round lunch package", description: "Main, soft drink and dessert, ready when you finish", price: 1900 },
      { category: "dinner", name: "Grilled tilapia", description: "Whole tilapia, ugali or rice, greens", price: 1900 },
      { category: "dinner", name: "Pepper steak", description: "Beef fillet, pepper sauce, vegetables, potatoes", price: 2400 },
      { category: "dinner", name: "Vegetable curry & rice", description: "Seasonal vegetables, coconut curry, rice", price: 1500 },
      { category: "dinner", name: "Tournament dinner package", description: "Three-course dinner for event guests", price: 3200 },
      { category: "snacks", name: "Samosas (4)", description: "Beef or vegetable samosas", price: 500 },
      { category: "snacks", name: "Club sandwich", description: "Triple-decker with fries", price: 900 },
      { category: "snacks", name: "Fresh juice", description: "Passion, mango or orange", price: 400 },
    ]);

    // ---------- Car wash ----------
    await tx.insert(s.carWashServices).values([
      { name: "Exterior wash", description: "Hand wash, rinse and dry", price: 500, durationMins: 20 },
      { name: "Full wash", description: "Exterior wash plus interior vacuum and dashboard wipe", price: 900, durationMins: 40 },
      { name: "Interior detail", description: "Deep clean of seats, carpets and trim", price: 2500, durationMins: 90 },
      { name: "Engine wash", description: "Careful degrease and rinse", price: 800, durationMins: 30 },
    ]);

    // ---------- Green fees, lessons, membership ----------
    await tx.insert(s.greenFees).values([
      { category: "Member's guest", weekday9: 1500, weekday18: 2500, weekend9: 1800, weekend18: 3000 },
      { category: "Visitor", weekday9: 2500, weekday18: 4000, weekend9: 3000, weekend18: 5000 },
      { category: "Junior (under 18)", weekday9: 500, weekday18: 800, weekend9: 600, weekend18: 1000 },
      { category: "Corporate", weekday9: 2200, weekday18: 3500, weekend9: 2600, weekend18: 4500 },
    ]);
    await tx.insert(s.lessons).values([
      { name: "Private lesson (1 hour)", kind: "private", description: "One-to-one coaching with the club professional", price: 3500 },
      { name: "Group lesson (1 hour)", kind: "group", description: "Small-group clinic, up to 6 players", price: 1500 },
      { name: "Junior lesson (1 hour)", kind: "junior", description: "Fun fundamentals for juniors", price: 1200 },
      { name: "Ladies' clinic (1 hour)", kind: "ladies", description: "Ladies' group coaching", price: 1500 },
      { name: "Private lessons ×5 package", kind: "private", description: "Five private lessons, save KSh 2,500", price: 15000 },
    ]);
    await tx.insert(s.membershipCategories).values([
      { name: "Full member", benefits: "Full course access, competitions, member rates on rooms, meals and guests", joiningFee: 50000, annualFee: 36000 },
      { name: "Corporate member", benefits: "Nominated representatives, corporate golf day discounts, member rates", joiningFee: 80000, annualFee: 60000 },
      { name: "Country / upcountry member", benefits: "For members living outside Nakuru: course access and competitions", joiningFee: 30000, annualFee: 18000 },
      { name: "Ladies member", benefits: "Ladies' section competitions, coaching clinics and member rates", joiningFee: 30000, annualFee: 28000 },
      { name: "Junior member", benefits: "Under 18: coaching, junior competitions and course access", joiningFee: 5000, annualFee: 8000 },
    ]);

    // ---------- Partners ----------
    const ps = await tx
      .insert(s.partners)
      .values([
        { slug: "kengen", name: "KenGen", tier: "platinum", description: "Title partner of the KenGen Golf Day at Nakuru Golf Club.", story: "KenGen's golf day brings colleagues, customers and partners to Nakuru each year for a flagship two-day tournament.", website: "https://www.kengen.co.ke", years: "Event partner", color: "#c8102e" },
        { slug: "kcb", name: "KCB", tier: "gold", description: "Partner of the KenGen Golf Day 2026.", story: "KCB supports club golf days and the growth of the game in Nakuru.", website: "https://ke.kcbgroup.com", years: "Event partner", color: "#00843d" },
        { slug: "kaishan", name: "Kaishan", tier: "gold", description: "Partner of the KenGen Golf Day 2026.", story: "Kaishan joins the KenGen Golf Day as a supporting partner.", website: "", years: "Event partner", color: "#1f4e9c" },
      ])
      .returning();
    await tx.insert(s.sponsorships).values([
      { partnerId: ps[0].id, eventId: kengen.id, role: "title", value: 0 },
      { partnerId: ps[1].id, eventId: kengen.id, role: "hospitality", value: 0 },
      { partnerId: ps[2].id, eventId: kengen.id, role: "prize", value: 0 },
      { partnerId: ps[1].id, eventId: challenge.id, role: "hole", value: 0 },
    ]);
    await tx.insert(s.sponsorPackages).values([
      { name: "Event title sponsor", benefits: "Event naming, logo on all event assets and tickets, hospitality team entries, speaking slot" },
      { name: "Hole sponsor", benefits: "Branded hole signage, logo on event page, one team entry" },
      { name: "Prize sponsor", benefits: "Prize naming, logo at prize-giving and on the results page" },
      { name: "Hospitality partner", benefits: "Branding at the dinner/gala, hospitality tickets" },
      { name: "Annual club partner", benefits: "Year-round logo on the site and in the clubhouse, member offers" },
    ]);

    // ---------- News & gallery ----------
    await tx.insert(s.newsPosts).values([
      { slug: "kengen-golf-day-registration-open", title: "KenGen Golf Day 2026: registration is open", body: "Entries for the KenGen Golf Day on 27–28 November are now open on our website. Register as an individual or a fourball, then add rooms, the gala dinner, a car wash and event merchandise in one checkout, paid by M-Pesa.", category: "tournaments", image: IMG.golf[0], publishedAt: d("2026-11-10T09:00:00+03:00") },
      { slug: "course-update-greens", title: "Course update: greens in top condition", body: "The greens team has completed the seasonal maintenance. Expect fast, true greens for the coming competitions. Please repair pitch marks and replace divots.", category: "course", image: IMG.mower, publishedAt: d("2026-10-28T09:00:00+03:00") },
      { slug: "october-medal-results", title: "October Monthly Medal results", body: "Congratulations to all division winners at the October Monthly Medal. Results are on the event page and in the gallery.", category: "club", image: IMG.golf[4], publishedAt: d("2026-10-12T09:00:00+03:00") },
      { slug: "members-renewals-online", title: "Members: renew online", body: "Members can now renew their subscription online using M-Pesa. Sign in with your phone number on the Account page and follow the renewal link.", category: "members", image: IMG.course, publishedAt: d("2026-09-30T09:00:00+03:00") },
    ]);
    await tx.insert(s.galleryPhotos).values([
      { album: "Nakuru Corporate Challenge 2026", url: IMG.golf[0], caption: "Fairway approach", eventId: challenge.id },
      { album: "Nakuru Corporate Challenge 2026", url: IMG.golf[1], caption: "Teams on the course", eventId: challenge.id },
      { album: "Nakuru Corporate Challenge 2026", url: IMG.golf[2], caption: "Out of the bunker", eventId: challenge.id },
      { album: "October Monthly Medal 2026", url: IMG.golf[3], caption: "Medal round", eventId: medal.id },
      { album: "October Monthly Medal 2026", url: IMG.golf[4], caption: "Monochrome swing", eventId: medal.id },
      { album: "The Course", url: IMG.hero, caption: "Sunrise over the course" },
      { album: "The Course", url: IMG.course, caption: "Twilight on the fairway" },
      { album: "The Course", url: IMG.mower, caption: "Greens maintenance" },
    ]);

    await tx.insert(s.settings).values([
      { key: "course_notice", value: COURSE_NOTE_DEFAULT },
      { key: "carwash_capacity", value: "3" },
      { key: "seeded", value: "1" },
    ]);
  });
}
