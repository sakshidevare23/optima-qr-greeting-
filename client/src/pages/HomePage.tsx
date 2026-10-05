import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, X, ArrowRight, Sparkles, MapPin, ChevronDown } from "lucide-react";
import { OCCASIONS, ALL_REGIONS, type Occasion } from "@/data/occasions";
import { norm, useI18n } from "@/lib/i18n";
import { Shell } from "@/components/Shell";

export function useRegionName() {
  const { t } = useI18n();
  return (r: string) => {
    const k = `region.${r}`;
    const v = t(k);
    return v === k ? r : v;
  };
}

export default function HomePage() {
  const { t, occ, lang } = useI18n();
  const regionName = useRegionName();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");

  const upcoming = useMemo(() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const next = (m % 12) + 1;
    return OCCASIONS.filter((o) => o.months.includes(m) || o.months.includes(next))
      .sort((a, b) => Number(b.popular) - Number(a.popular))
      .slice(0, 10);
  }, []);

  const results = useMemo(() => {
    const n = norm(q);
    const list = OCCASIONS.filter((o) => {
      if (region && !o.regions.includes(region)) return false;
      if (!n) return true;
      const hay = norm([
        occ(o, "name"),
        o.name,
        o.headline,
        occ(o, "headline"),
        ...(o.keywords ?? []),
        ...(o.alternativeNames ?? []),
        ...(o.date ? [o.date] : []),
        ...o.regions,
        ...o.regions.map(regionName),
      ].join(" "));
      return n.split(" ").every((part) => hay.includes(part));
    });
    return [...list.filter((o) => o.popular), ...list.filter((o) => !o.popular)];
  }, [q, region, occ, regionName]);

  return (
    <Shell>
      <div className="w-full px-3 pb-8 pt-4 sm:px-5 lg:px-8">
        <section className="mx-auto w-full max-w-[1500px]">
          <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-sm sm:p-6 lg:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">{t("home.chooseOccasion")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("home.searchPlaceholder")}</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">{t("home.results", { count: results.length })}</span>
            </div>

            {/* Required flow starts with search */}
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="relative block">
                <span className="sr-only">{t("home.searchPlaceholder")}</span>
                <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  data-testid="input-occasion-search"
                  className="h-14 w-full rounded-2xl border border-border bg-background pe-12 ps-12 text-[15px] text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {q && (
                  <button onClick={() => setQ("")} aria-label={t("home.clear")} data-testid="button-clear-occasion-search" className="absolute end-2.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </label>
              <label className="relative inline-flex items-center">
                <MapPin className="pointer-events-none absolute start-4 h-4 w-4 text-primary" />
                <select value={region} onChange={(e) => setRegion(e.target.value)} data-testid="select-region" aria-label={t("home.region")} className="h-14 w-full appearance-none rounded-2xl border border-border bg-background pe-10 ps-10 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring lg:w-[210px]">
                  <option value="">{t("home.allRegions")}</option>
                  {ALL_REGIONS.map((r) => <option key={r} value={r}>{regionName(r)}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute end-3.5 h-4 w-4 text-muted-foreground" />
              </label>
            </div>
          </div>
        </section>

        {/* Required order: Coming soon, then available */}
        {upcoming.length > 0 && (
          <section className="mx-auto mt-7 w-full max-w-[1500px]">
            <div className="mb-3 flex items-center gap-2 px-1">
              <Sparkles className="h-4 w-4 text-[hsl(32_85%_45%)]" />
              <h2 className="text-lg font-bold text-foreground">{t("home.comingUp")}</h2>
            </div>
            <div className="flex flex-col gap-2">
              {upcoming.map((o) => <OccasionCard key={o.id} o={o} lang={lang.code} className="w-full" testPrefix="upcoming" />)}
            </div>
          </section>
        )}

        <section className="mx-auto mt-8 w-full max-w-[1500px]">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-foreground">{t("home.available")}</h2>
            <span className="text-xs text-muted-foreground">{t("home.results", { count: results.length })}</span>
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center" data-testid="status-no-occasions">
              <p className="font-semibold text-foreground">{t("home.noResults", { query: q })}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("home.noResultsHint")}</p>
              <Link href={`/${lang.code}/create/best-wishes`} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground" data-testid="link-best-wishes">
                {t("occ.best-wishes.name")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((o, i) => <OccasionCard key={o.id} o={o} lang={lang.code} testPrefix="occasion" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }} className="animate-rise" />)}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}

export function OccasionCard({ o, lang, className = "", testPrefix, style }: { o: Occasion; lang: string; className?: string; testPrefix: string; style?: React.CSSProperties }) {
  const { occ } = useI18n();
  const regionName = useRegionName();
  const regional = o.category === "regional" && o.regions[0] !== "All India";

  return (
    <Link
      href={`/${lang}/create/${o.id}`}
      data-testid={`card-${testPrefix}-${o.id}`}
      style={style}
      className={`group flex min-h-[58px] w-full items-center justify-between gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <span className="min-w-0 truncate text-[15px] font-semibold text-foreground sm:text-base">
        {occ(o, "name")}
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {regional && (
          <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground sm:inline-flex">
            {regionName(o.regions[0])}
          </span>
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
      </span>
    </Link>
  );
}
