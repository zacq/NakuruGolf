import type { ReactNode } from "react";

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

// MO-7: phones download a phone-sized image
export function imgSizes(src: string) {
  const m = /^https:\/\/images\.pexels\.com\/.*[?&]w=(\d+)&h=(\d+)/.exec(src);
  if (!m) return {};
  const max = Number(m[1]);
  const ratio = Number(m[2]) / max;
  const at = (w: number) => `${src.replace(/w=\d+&h=\d+/, `w=${w}&h=${Math.round(w * ratio)}`)} ${w}w`;
  return { srcSet: [480, 800, max].filter((w) => w <= max).map(at).join(", "), sizes: "(max-width: 768px) 100vw, 50vw" };
}

export function PageHero({ title, intro, image, children }: { title: string; intro?: string; image?: string; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-fairway-900 text-white">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} {...imgSizes(image)} sizes="100vw" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35" loading="eager" fetchPriority="high" />
      )}
      <div className="container-x py-10 sm:py-16">
        <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-base text-fairway-100 sm:text-lg">{intro}</p>}
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-gold-600">{eyebrow}</p>}
      <h2 className="text-2xl font-bold text-fairway-900 sm:text-3xl">{title}</h2>
      {intro && <p className="mt-2 max-w-2xl text-fairway-800/80">{intro}</p>}
    </div>
  );
}

export function Img({ src, alt, className = "", eager }: { src: string; alt: string; className?: string; eager?: boolean }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} {...imgSizes(src)} alt={alt} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : undefined} decoding="async" className={`object-cover ${className}`} />;
}
