import Link from "next/link";
import type { Metadata } from "next";
import { PageHero } from "@/components/Bits";
import { getLeaderboard } from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Leaderboard", description: "Nakuru Golf Club leaderboard from HowDidiDo." };

export default async function LeaderboardPage() {
  const board = await getLeaderboard();
  return (
    <>
      <PageHero title={board.title} intro={`Results from HowDidiDo${board.updated ? `, updated ${board.updated}` : ""}. Play, post your score and climb the table.`}>
        <Link href="/events" className="btn-gold">Enter the next event</Link>
      </PageHero>
      <div className="container-x section">
        {board.sample && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Sample data: staff replace it with the HowDidiDo export from the dashboard.</p>}
        <div className="overflow-x-auto rounded-2xl border border-fairway-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-fairway-800 text-white"><tr><th className="p-3">Pos</th><th className="p-3">Player</th><th className="p-3">Handicap</th><th className="p-3">Points</th></tr></thead>
            <tbody>
              {board.rows.map((r) => <tr key={r.pos + r.name} className="border-t border-fairway-100"><td className="p-3 font-bold">{r.pos}</td><td className="p-3">{r.name}</td><td className="p-3">{r.handicap}</td><td className="p-3 font-bold">{r.points}</td></tr>)}
              {board.rows.length === 0 && <tr><td colSpan={4} className="p-4">The leaderboard will appear after the next competition.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
