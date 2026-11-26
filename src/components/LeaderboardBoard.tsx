import Link from "next/link";
import type { BoardRow } from "@/lib/leaderboard";

const MEDAL = ["bg-gold-400 text-fairway-900", "bg-gray-200 text-fairway-900", "bg-amber-600 text-white"];

/** Semi-translucent HowDidiDo leaderboard for the home page hero. */
export default function LeaderboardBoard({ board }: { board: { rows: BoardRow[]; title: string; sample: boolean; updated: string } }) {
  const rows = board.rows.slice(0, 8);
  return (
    <aside aria-label={board.title} className="w-full rounded-3xl bg-fairway-900/45 p-4 shadow-2xl ring-1 ring-white/20 backdrop-blur-md sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-300">Club leaderboard · HowDidiDo</p>
          <h2 className="font-serif text-xl font-bold text-white">{board.title}</h2>
        </div>
        {board.sample && <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-fairway-900">Sample</span>}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl bg-white/10 p-4 text-sm text-fairway-100">Results appear here after the next competition. Enter an event, score on HowDidiDo and see your name on the board.</p>
      ) : (
        <table className="w-full text-sm text-white">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-fairway-200">
              <th className="pb-2 font-semibold">Pos</th>
              <th className="pb-2 font-semibold">Player</th>
              <th className="pb-2 text-center font-semibold">HCP</th>
              <th className="pb-2 text-right font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.pos + r.name} className={`border-t border-white/10 ${i < 3 ? "bg-white/5" : ""}`}>
                <td className="py-2 pr-2">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${MEDAL[i] || "bg-white/10 text-white"}`}>{r.pos}</span>
                </td>
                <td className={`max-w-0 truncate py-2 pr-2 ${i < 3 ? "font-semibold" : ""}`}>{r.name}</td>
                <td className="py-2 text-center text-fairway-100">{r.handicap}</td>
                <td className={`py-2 text-right font-serif font-bold ${i === 0 ? "text-lg text-gold-300" : ""}`}>{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-fairway-100">
        <span>{board.updated ? `Updated ${board.updated}` : "Updated after each competition"}</span>
        <Link href="/leaderboard" className="flex min-h-11 items-center font-semibold text-gold-300 underline">Full leaderboard →</Link>
      </div>
    </aside>
  );
}
