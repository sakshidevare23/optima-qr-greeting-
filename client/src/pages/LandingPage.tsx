import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { LANGUAGES, LANGUAGE_MAP, SCRIPT_FONTS } from "@/i18n/languages";
import { API_BASE } from "@/lib/queryClient";
import { ENGLISH_TRANSLATIONS, getMissingTranslationKeys, getTranslation, loadDict, TranslationNotice, UI_TRANSLATION_KEY_COUNT } from "@/lib/i18n";

/** Public landing page: language changes the current page; Get Started starts the app. */
export default function LandingPage() {
  const [, navigate] = useLocation();
  const [language, setLanguage] = useState("en");
  const [loaded, setLoaded] = useState<{ code: string; dict: Record<string, string> } | null>(() => ({
    code: "en",
    dict: ENGLISH_TRANSLATIONS,
  }));
  const [loadError, setLoadError] = useState<{ code: string; message: string } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("qrm.lang") || "en";
    if (LANGUAGE_MAP[saved]) setLanguage(saved);
    const fromQr = new URLSearchParams(window.location.search).get("qr") === "1";
    if (fromQr) {
      try { sessionStorage.setItem("qrm.qrScanSession", "1"); } catch {}
    }

    fetch(`${API_BASE}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "visit" }),
      keepalive: true,
    }).catch(() => {});

    const onPageHide = () => {
      if (started.current) return;
      const body = JSON.stringify({ event: "bounce" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`${API_BASE}/api/track`, new Blob([body], { type: "application/json" }));
      } else {
        fetch(`${API_BASE}/api/track`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => {
    let alive = true;
    const lang = LANGUAGE_MAP[language] ?? LANGUAGE_MAP.en;
    setLoadError(null);
    loadDict(lang.code).then(
      (dict) => {
        if (alive) setLoaded({ code: lang.code, dict });
      },
      (error: unknown) => {
        if (alive) setLoadError({
          code: lang.code,
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
    const f = SCRIPT_FONTS[lang.script];
    document.documentElement.lang = lang.code;
    document.documentElement.dir = lang.rtl ? "rtl" : "ltr";
    const href = `https://fonts.googleapis.com/css2?${f.google.map((x) => `family=${x}`).join("&")}&display=swap`;
    const id = `landing-script-${lang.script}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
    return () => { alive = false; };
  }, [language]);

  const dict = loaded?.code === language ? loaded.dict : {};
  const ready = loaded?.code === language;
  const languageInfo = LANGUAGE_MAP[language] ?? LANGUAGE_MAP.en;
  const missingKeys = ready ? getMissingTranslationKeys(language, dict) : [];
  const hasNoTranslations = ready && language !== "en" && missingKeys.length === UI_TRANSLATION_KEY_COUNT;
  const t = (key: string) => getTranslation(language, key, dict);
  const markStarted = () => {
    if (started.current) return;
    started.current = true;
    fetch(`${API_BASE}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "start" }),
      keepalive: true,
    }).catch(() => {});
  };

  const start = () => {
    markStarted();
    try { sessionStorage.setItem("qrm.lang", language); } catch {}
    navigate(`/${language}`);
  };

  const chooseLanguage = (code: string) => {
    setLanguage(code);
    try { sessionStorage.setItem("qrm.lang", code); } catch {}
    // Deliberately do not navigate: the landing page itself changes language.
  };

  return (
    <div className="min-h-[100dvh] bg-background paper-grain">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-end px-3 sm:px-5 lg:px-8">
          <label className="relative inline-flex items-center">
            <Globe className="pointer-events-none absolute start-3 h-4 w-4 text-primary" aria-hidden="true" />
            <select
              value={language}
              onChange={(e) => chooseLanguage(e.target.value)}
              aria-label={languageInfo.native}
              data-testid="select-landing-language"
              className="h-11 min-w-[138px] appearance-none rounded-full border border-border bg-card pe-9 ps-9 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.native} — {l.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </label>
        </div>
      </header>

      <main className="w-full px-3 pb-8 pt-3 sm:px-5 sm:pt-5 lg:px-8">
        {loadError?.code === language ? (
          <p role="alert" className="mx-auto mt-8 max-w-3xl rounded-xl border border-destructive/30 bg-card p-4 text-sm">
            Unable to load the {languageInfo.name} translation: {loadError.message}
          </p>
        ) : !ready ? (
          <p role="status" className="mx-auto mt-8 max-w-3xl rounded-xl border border-border bg-card p-4 text-sm">
            Loading translation for <span lang={language}>{languageInfo.native}</span>…
          </p>
        ) : hasNoTranslations ? (
          <TranslationNotice lang={languageInfo} missingKeys={missingKeys} blocking />
        ) : (
          <>
          {missingKeys.length > 0 && <TranslationNotice lang={languageInfo} missingKeys={missingKeys} />}
          <section className="w-full overflow-hidden rounded-[30px] border border-border/70 bg-[hsl(40_60%_94%)]">
          <div className="relative">
            <div className="relative z-10 px-6 pb-7 pt-8 sm:px-10 sm:pb-8 sm:pt-10">
              <h1 className="max-w-[480px] font-display text-[2.05rem] font-bold leading-[1.08] text-foreground sm:text-[2.7rem]">
                {t("home.heroTitle1")}<br /><span className="text-primary">{t("home.heroTitle2")}</span>
              </h1>
              <p className="mt-4 max-w-[500px] text-[15px] leading-relaxed text-foreground/75 sm:text-base">
                {t("home.heroText")}
              </p>
              <button
                onClick={start}
                data-testid="button-get-started"
                className="mt-6 inline-flex min-h-[52px] items-center gap-2 rounded-xl bg-primary px-7 text-[16px] font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98]"
              >
                {t("home.getStarted")} <ArrowRight className="h-5 w-5 rtl:rotate-180" />
              </button>
            </div>
            <div className="relative min-h-[260px] h-[38vh] sm:min-h-[360px] sm:h-[48vh] lg:min-h-[500px]">
              <img src="./art/hero.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-[hsl(40_60%_94%)] via-transparent to-transparent" />
            </div>
          </div>
          </section>
          </>
        )}
      </main>
    </div>
  );
}
