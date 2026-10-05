import { useEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { Download, QrCode, BarChart3, ExternalLink, LogOut, LockKeyhole } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";

interface Stats {
  scans: number;
  visits: number;
  starts: number;
  bounces: number;
  greetings: number;
  qrGreetings: number;
  since: string;
  qrTarget: string;
  publicUrl: string;
}

export default function QrAdminPage() {
  const origin = window.location.origin + window.location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");
  const [url, setUrl] = useState(`${origin}/go`);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refresh = async () => {
    const r = await fetch(`${API_BASE}/api/stats`);
    if (r.status === 401) { setLoggedIn(false); setStats(null); return; }
    if (!r.ok) throw new Error("stats");
    const s = await r.json() as Stats;
    setStats(s);
    if (s.publicUrl) setUrl(`${s.publicUrl.replace(/\/$/, "")}/go`);
    setLoggedIn(true);
  };

  useEffect(() => {
    refresh().catch(() => setLoggedIn(false));
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const timer = window.setInterval(() => refresh().catch(() => {}), 10000);
    return () => window.clearInterval(timer);
  }, [loggedIn]);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const r = await fetch(`${API_BASE}/api/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!r.ok) { const body = await r.json().catch(() => ({})); throw new Error(body.message || "Login failed"); }
      setPassword("");
      await refresh();
    } catch (e) {
      setLoginError((e as Error).message);
    }
  };

  const logout = async () => {
    await fetch(`${API_BASE}/api/admin/logout`, { method: "POST" }).catch(() => {});
    setLoggedIn(false);
    setStats(null);
  };

  const draw = async (canvas: HTMLCanvasElement, size: number) => {
    await QRCode.toCanvas(canvas, url, { width: size, margin: 2, errorCorrectionLevel: "H", color: { dark: "#0F3D2E", light: "#FFFFFF" } });
  };

  useEffect(() => {
    if (loggedIn && canvasRef.current && url) draw(canvasRef.current, 320).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, loggedIn]);

  const downloadPng = async () => { const c = document.createElement("canvas"); await draw(c, 2048); const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "greeting-qr.png"; a.click(); };
  const downloadSvg = async () => { const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "H", color: { dark: "#0F3D2E", light: "#FFFFFF" } }); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); a.download = "greeting-qr.svg"; a.click(); };

  if (!loggedIn) return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background px-4 py-8">
      <form onSubmit={login} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><LockKeyhole className="h-6 w-6" /></div>
        <h1 className="mt-5 text-2xl font-bold text-foreground">Admin login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to view QR controls and anonymous usage counts.</p>
        <label className="mt-6 block text-sm font-semibold text-foreground">Username<input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary" autoComplete="username" /></label>
        <label className="mt-4 block text-sm font-semibold text-foreground">Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary" autoComplete="current-password" /></label>
        {loginError && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive" role="alert">{loginError}</p>}
        <button type="submit" className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">Login</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full bg-background paper-grain">
      <div className="w-full px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><QrCode className="h-6 w-6 text-primary" /> QR & usage dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Anonymous aggregate counts only.</p></div>
            <button onClick={logout} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground"><LogOut className="h-4 w-4" /> Logout</button>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-border bg-card p-4 text-center"><canvas ref={canvasRef} className="mx-auto h-auto w-full max-w-[320px]" data-testid="canvas-qr" /><p className="mt-2 text-sm font-semibold text-foreground">Scan to create your greeting</p><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={downloadPng} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" /> PNG</button><button onClick={downloadSvg} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground"><Download className="h-4 w-4" /> SVG</button></div></div>
            <div className="space-y-4">
              <label className="block rounded-2xl border border-border bg-card p-4"><span className="text-sm font-semibold text-foreground">URL encoded in the QR</span><input value={url} onChange={(e) => setUrl(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" /><span className="mt-2 block text-xs text-muted-foreground">The QR points to <b>/go</b>, which redirects to the public greeting flow.</span><a href={url} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">Test the link <ExternalLink className="h-3.5 w-3.5" /></a></label>
              <div className="rounded-2xl border border-border bg-card p-4"><h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><BarChart3 className="h-4 w-4 text-primary" /> Anonymous usage</h2>{stats ? <><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"><Metric value={stats.scans} label="QR scans" /><Metric value={stats.visits} label="Landing visits" /><Metric value={stats.starts} label="Get started" /><Metric value={stats.greetings} label="Greetings generated" /><Metric value={stats.qrGreetings} label="QR → greeting" /><Metric value={stats.bounces} label="Backouts" /></div><p className="mt-4 text-xs text-muted-foreground">Counters are stored in <code>server/data/analytics.json</code>. Started: {new Date(stats.since).toLocaleString()}</p></> : <p className="mt-2 text-sm text-muted-foreground">Stats unavailable.</p>}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <div className="text-2xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
