import Link from "next/link";

export function PartnerBadge({ name, color, slug, logo, size = "md" }: { logo?: string | null; name: string; color?: string | null; slug: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-24 min-w-40 px-6 text-2xl" : size === "sm" ? "h-12 min-w-24 px-3 text-sm" : "h-16 min-w-32 px-4 text-lg";
  return (
    <Link
      href={`/partners/${slug}`}
      aria-label={`${name} partner profile`}
      className={`inline-flex items-center justify-center rounded-xl border-2 bg-white font-serif font-bold tracking-wide shadow-sm transition hover:shadow-md ${dims}`}
      style={{ color: color || "#0f3f2c", borderColor: (color || "#0f3f2c") + "55" }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} loading="lazy" className="max-h-[70%] max-w-36 object-contain" />
      ) : (
        name
      )}
    </Link>
  );
}
