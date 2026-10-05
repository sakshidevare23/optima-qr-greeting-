import type { ReactNode } from "react";
import { ChevronDown, Globe, Repeat } from "lucide-react";
import { useLocation } from "wouter";
import { TranslationNotice, useI18n } from "@/lib/i18n";
import { LANGUAGES } from "@/i18n/languages";
import { save } from "@/lib/persist";

export function Header() {
  const { lang, t } = useI18n();
  const [, navigate] = useLocation();
  const changeLanguage = (code: string) => {
    save("lang", code);
    const path = window.location.hash.replace(/^#/, "") || "/";
    const next = path.replace(/^\/[^/]+/, `/${code}`);
    navigate(next === path && !path.startsWith(`/${lang.code}`) ? `/${code}` : next);
  };
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-end px-3 sm:h-16 sm:px-5 lg:px-8">
        <label className="relative inline-flex items-center">
          <Globe className="pointer-events-none absolute start-3 h-4 w-4 text-primary" aria-hidden="true" />
          <select value={lang.code} onChange={(e) => changeLanguage(e.target.value)} aria-label={t("lang.change")} data-testid="select-header-language" className="h-11 min-w-[150px] appearance-none rounded-full border border-border bg-card pe-9 ps-9 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10">
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native} — {l.name}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </label>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  return <footer className="mt-10 border-t border-border/70 bg-card/60"><div className="flex w-full items-center justify-center px-4 py-7 text-center"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Repeat className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{t("footer.repeat")}</p></div></footer>;
}

export function Shell({ children }: { children: ReactNode }) {
  const { lang, missingKeys } = useI18n();
  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      {missingKeys.length > 0 && <div className="px-3 pt-3 sm:px-5 lg:px-8"><TranslationNotice lang={lang} missingKeys={missingKeys} /></div>}
      <Header />
      <main className="min-w-0 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
