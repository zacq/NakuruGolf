import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container-x section text-center">
      <h1 className="text-3xl font-bold text-fairway-900">Page not found</h1>
      <p className="mt-2">That page has moved or no longer exists.</p>
      <div className="mt-6 grid justify-center gap-3 sm:flex">
        <Link href="/" className="btn-primary">Home</Link>
        <Link href="/events" className="btn-outline">Events</Link>
      </div>
    </main>
  );
}
