import type { Metadata } from "next";
import { DEPOSIT_PCT } from "@/lib/constants";

export const metadata: Metadata = { title: "Policies — cancellation, privacy & data", description: "Cancellation, refund and privacy policies for Nakuru Golf Club bookings." };

export default function Policies() {
  return (
    <div className="container-x section max-w-3xl prose-club">
      <h1 className="mb-4 text-4xl font-bold text-fairway-900">Policies</h1>
      <h2 className="mb-2 mt-6 text-2xl font-bold">Cancellation & refunds</h2>
      <p>Rooms: free changes and cancellation up to 48 hours before arrival. Later cancellations may forfeit the first night. A {DEPOSIT_PCT}% deposit can be paid at booking; the balance is due at check-in.</p>
      <p>Event entries: refundable until the entry deadline, less any non-refundable costs. Transfers to another player are free until the day before the event.</p>
      <p>Car wash, tables, tee times: cancel at least 2 hours ahead via WhatsApp for a full refund. Merchandise: exchange within 7 days if unworn.</p>
      <p>Refunds are processed by club staff to the original M-Pesa number and recorded with a reason.</p>
      <h2 className="mb-2 mt-6 text-2xl font-bold">Privacy & data protection</h2>
      <p>We collect your name, phone, email and booking details to provide your booking and send receipts, tickets and reminders. We only send marketing messages if you opt in, and every message includes an opt-out. We follow the Kenya Data Protection Act, 2019. To access or delete your data, contact info@nakurugolfclub.co.ke or WhatsApp reception.</p>
      <p>We never store card data. M-Pesa payments are confirmed by Safaricom to our server.</p>
    </div>
  );
}
