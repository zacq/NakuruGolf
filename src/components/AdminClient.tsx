"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Field } from "./ui";

export function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <form className="grid gap-3" onSubmit={async (e) => {
      e.preventDefault();
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      if (r.ok) router.refresh(); else setErr("Wrong password");
    }}>
      <Field label="Password"><input type="password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required /></Field>
      {err && <Alert>{err}</Alert>}
      <button className="btn-primary">Sign in</button>
    </form>
  );
}

export function AdminLogout() {
  const router = useRouter();
  return <button className="underline" onClick={async () => { await fetch("/api/admin/login", { method: "DELETE" }); router.refresh(); }}>Sign out</button>;
}

type Result = { ok: boolean; message: string; holder?: string; ticket?: string; shirt?: string; dietary?: string; players?: { name: string }[] };

export function CheckinClient({ events }: { events: { id: number; name: string }[] }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? 0);
  const [code, setCode] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [counts, setCounts] = useState<{ total: number; checkedIn: number } | null>(null);
  const [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);

  const refresh = useCallback(() => {
    fetch(`/api/admin/checkin?eventId=${eventId}`).then((r) => r.json()).then(setCounts).catch(() => null);
  }, [eventId]);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const submit = useCallback(async (c: string) => {
    if (!c || busy.current) return;
    busy.current = true;
    const r = await fetch("/api/admin/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c, eventId }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setRes(j || { ok: false, message: "No connection" });
    if (j?.total != null) setCounts({ total: j.total, checkedIn: j.checkedIn });
    setCode("");
    setTimeout(() => { busy.current = false; }, 1500);
  }, [eventId]);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let stop = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Detector = (window as any).BarcodeDetector;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        const det = new Detector({ formats: ["qr_code"] });
        const loop = async () => {
          if (stop || !video.current) return;
          try {
            const codes = await det.detect(video.current);
            if (codes[0]) submit(codes[0].rawValue);
          } catch { /* ignore */ }
          setTimeout(loop, 400);
        };
        loop();
      } catch {
        setScanning(false);
        setRes({ ok: false, message: "Camera unavailable. Type the code instead." });
      }
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [scanning, submit]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canScan = typeof window !== "undefined" && "BarcodeDetector" in (window as any);

  return (
    <div className="grid max-w-xl gap-4">
      <Field label="Event"><select className="field" value={eventId} onChange={(e) => setEventId(Number(e.target.value))}>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></Field>
      <div className="card flex items-center justify-between">
        <div><p className="text-sm text-fairway-800/70">Checked in</p><p className="font-serif text-4xl font-bold text-fairway-800">{counts?.checkedIn ?? "–"} <span className="text-xl text-fairway-800/60">/ {counts?.total ?? "–"}</span></p></div>
        <div className="h-3 w-32 overflow-hidden rounded-full bg-fairway-100"><div className="h-full bg-gold-500" style={{ width: `${counts && counts.total ? (counts.checkedIn / counts.total) * 100 : 0}%` }} /></div>
      </div>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); submit(code.trim()); }}>
        <input className="field text-center font-mono text-xl uppercase tracking-widest" placeholder="NGC-XXXXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoFocus />
        <button className="btn-primary">Check in</button>
        {canScan && <button type="button" className="btn-outline" onClick={() => setScanning((s) => !s)}>{scanning ? "Stop camera" : "📷 Scan QR with camera"}</button>}
      </form>
      {scanning && <video ref={video} playsInline muted className="w-full rounded-2xl bg-black" />}
      {res && (
        <div role="status" className={`rounded-2xl p-4 text-white ${res.ok ? "bg-fairway-600" : "bg-red-700"}`}>
          <p className="text-xl font-bold">{res.ok ? "✓ " : "✕ "}{res.message}</p>
          {res.holder && <p className="text-lg">{res.holder} · {res.ticket}</p>}
          {res.players && res.players.length > 1 && <p className="text-sm">{res.players.map((p) => p.name).join(", ")}</p>}
          {(res.shirt || res.dietary) && <p className="text-sm">Shirt: {res.shirt || "–"} · Dietary: {res.dietary || "–"}</p>}
        </div>
      )}
    </div>
  );
}
