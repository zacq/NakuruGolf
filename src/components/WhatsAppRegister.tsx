"use client";

import { useEffect, useState } from "react";
import { WA_CHANNEL, waLink } from "@/lib/constants";
import { track } from "@/lib/analytics";

/**
 * Lead capture on WhatsApp: opens a chat with the club, pre-filled with the event, the chosen tee time and a link
 * straight back to that slot, so the registration link is in the golfer's chat from the first message.
 */
export default function WhatsAppRegister({
  event,
  tee,
  className = "btn-wa",
  showChannel = true,
}: {
  event: { name: string; slug: string };
  tee?: { id: number; label: string } | null;
  className?: string;
  showChannel?: boolean;
}) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const link = `${origin}/events/${event.slug}${tee ? `?tee=${tee.id}` : ""}#tee-sheet`;
  const message = [
    `Hello Nakuru Golf Club, I'd like to register for the ${event.name}${tee ? `, tee time ${tee.label}` : ""}.`,
    `Registration link: ${link}`,
    WA_CHANNEL ? "Please also add me to the club's WhatsApp channel for tournament news." : "Please keep me updated on tournaments on WhatsApp.",
  ].join("\n");

  return (
    <>
      <a
        href={waLink(message)}
        target="_blank"
        rel="noopener"
        onClick={() => track("whatsapp_register", { event: event.slug, tee: tee?.label })}
        className={className}
      >
        💬 Register on WhatsApp
      </a>
      {showChannel && WA_CHANNEL && (
        <a href={WA_CHANNEL} target="_blank" rel="noopener" onClick={() => track("whatsapp_channel_join", { event: event.slug })} className="flex min-h-12 items-center justify-center text-sm font-semibold underline">
          Join the club&apos;s WhatsApp channel
        </a>
      )}
    </>
  );
}
