import type { Metadata } from "next";
import { db } from "@/db";
import { desc } from "drizzle-orm";
import * as s from "@/db/schema";
import { fmtDate } from "@/lib/constants";
import { Img, PageHero, SectionTitle } from "@/components/Bits";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "News & gallery", description: "Club news, tournament reports, course notices and photo galleries from Nakuru Golf Club." };

export default async function NewsPage() {
  const [posts, photos] = await Promise.all([db.select().from(s.newsPosts).orderBy(desc(s.newsPosts.publishedAt)), db.select().from(s.galleryPhotos)]);
  const albums = [...new Set(photos.map((p) => p.album))];
  return (
    <>
      <PageHero title="News & gallery" intro="Club news, tournament reports, course notices and photos from our events." />
      <div className="container-x section grid gap-12">
        <section className="grid gap-5 md:grid-cols-2">
          {posts.map((n) => (
            <article id={n.slug} key={n.id} className="scroll-mt-20 overflow-hidden rounded-2xl border border-fairway-100 bg-white shadow-sm">
              {n.image && <Img src={n.image} alt="" className="h-44 w-full" />}
              <div className="p-5"><span className="chip">{n.category}</span><h2 className="mt-2 text-xl font-bold text-fairway-900">{n.title}</h2><p className="text-xs text-fairway-800/60">{fmtDate(n.publishedAt)}</p><p className="mt-2">{n.body}</p></div>
            </article>
          ))}
        </section>
        <section id="gallery" className="scroll-mt-20">
          <SectionTitle title="Galleries" intro="Photos by event and season. Tap a photo to open it full size and share the link." />
          {albums.map((a) => (
            <div key={a} className="mb-8"><h3 className="mb-2 text-lg font-bold">{a}</h3>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{photos.filter((p) => p.album === a).map((p) => <a key={p.id} href={p.url} target="_blank" rel="noopener"><Img src={p.url} alt={p.caption || a} className="h-36 w-full rounded-xl" /></a>)}</div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
