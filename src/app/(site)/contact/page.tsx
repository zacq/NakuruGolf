import type { Metadata } from "next";
import { CLUB, waLink } from "@/lib/constants";
import LeadForm from "@/components/LeadForm";
import { PageHero } from "@/components/Bits";

export const metadata: Metadata = { title: "Contact Nakuru Golf Club", description: "Reception hours, phone, WhatsApp, email and directions to Nakuru Golf Club, behind Nakuru Show Ground, Showground Road." };

export default function ContactPage() {
  return (
    <>
      <PageHero title="Contact us" intro="Ask us anything. WhatsApp is the fastest way to reach reception." />
      <div className="container-x section grid gap-8 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          <a href={waLink("Hello Nakuru Golf Club, I have a question.")} target="_blank" rel="noopener" className="btn-wa text-lg">💬 Chat on WhatsApp</a>
          <a href={`tel:${CLUB.phone}`} className="btn-primary text-lg">📞 Call {CLUB.phoneDisplay}</a>
          <a href={`mailto:${CLUB.email}`} className="btn-outline">✉️ {CLUB.email}</a>
          <div className="card"><h2 className="text-lg font-bold">Reception hours</h2><p>{CLUB.hours}</p><h2 className="mt-3 text-lg font-bold">Find us</h2><p>{CLUB.address}</p>
            <a className="mt-2 inline-block font-semibold underline" target="_blank" rel="noopener" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CLUB.mapQuery)}`}>Get directions →</a></div>
          <iframe title="Map to Nakuru Golf Club" loading="lazy" className="h-72 w-full rounded-2xl border-0" src={`https://www.google.com/maps?q=${encodeURIComponent(CLUB.mapQuery)}&output=embed`} />
        </div>
        <div className="card">
          <h2 className="mb-3 text-xl font-bold">Send an enquiry</h2>
          <LeadForm type="general" showCompany={false} fields={[
            { name: "topic", label: "Topic", type: "select", options: ["General", "Events & tournaments", "Rooms & accommodation", "Restaurant", "Car wash", "Membership", "Sponsorship", "Shop"] },
            { name: "message", label: "Message", type: "textarea", required: true },
          ]} />
        </div>
      </div>
    </>
  );
}
