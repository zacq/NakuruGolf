// Runs every 15 minutes: triggers the reminder job inside the Next.js app.
export default async () => {
  const res = await fetch(`${process.env.URL}/api/cron/reminders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  });
  console.log("reminders", res.status, await res.text());
};

export const config = { schedule: "*/15 * * * *" };
