import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/i18n/locales/en.json";
import { LANGUAGE_MAP, SCRIPT_FONTS, type Language, type Script } from "@/i18n/languages";
import { isIdentityTranslationKey } from "@/i18n/identity-keys";
import type { Occasion } from "@/data/occasions";

type Dict = Record<string, string>;
const EN = en as Dict;
export const ENGLISH_TRANSLATIONS = EN;
export const UI_TRANSLATION_KEY_COUNT = Object.keys(EN).length;

// Lazy-load every locale file (code-split per language)
const loaders = import.meta.glob<{ default: Dict }>("../i18n/locales/*.json");

const cache = new Map<string, Dict>([["en", EN]]);

export function getMissingTranslationKeys(code: string, dict: Dict) {
  if (code === "en") return [];
  return Object.keys(EN).filter((key) => (
    !dict[key]?.trim()
    || (dict[key] === EN[key] && !isIdentityTranslationKey(key, EN[key]))
  ));
}

export function getTranslation(code: string, key: string, dict: Dict) {
  const value = dict[key];
  return value && (
    code === "en"
    || value !== EN[key]
    || isIdentityTranslationKey(key, EN[key])
  ) ? value : `⟦${key}⟧`;
}

export async function loadDict(code: string): Promise<Dict> {
  if (!LANGUAGE_MAP[code]) {
    throw new Error(`Unsupported language code: ${code}`);
  }
  const cached = cache.get(code);
  if (cached) return cached;
  const loader = loaders[`../i18n/locales/${code}.json`];
  if (!loader) {
    throw new Error(`Missing locale file for: ${code}`);
  }
  const mod = await loader();
  const dict = mod.default;
  if (!dict || typeof dict !== "object") {
    throw new Error(`Invalid locale dictionary for: ${code}`);
  }
  cache.set(code, dict);
  return dict;
}

const loadedScripts = new Set<Script>();
export function ensureScriptFonts(script: Script) {
  if (loadedScripts.has(script)) return;
  loadedScripts.add(script);
  const fams = SCRIPT_FONTS[script].google;
  const href = `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f}`).join("&")}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export function format(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

interface I18nCtx {
  lang: Language;
  ready: boolean;
  missingKeys: string[];
  t: (key: string, vars?: Record<string, string | number>) => string;
  occ: (o: Occasion, field: "name" | "headline" | "message") => string;
  fonts: { display: string; body: string };
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ code, children }: { code: string; children: ReactNode }) {
  const lang = LANGUAGE_MAP[code];
  if (!lang) {
    return (
      <div role="alert" className="mx-auto mt-12 max-w-xl rounded-2xl border border-destructive/30 bg-card p-6 text-sm">
        Unsupported language code: {code}
      </div>
    );
  }
  return <LanguageProvider lang={lang}>{children}</LanguageProvider>;
}

function LanguageProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  const [loaded, setLoaded] = useState<{ code: string; dict: Dict } | null>(() => {
    const dict = cache.get(lang.code);
    return dict ? { code: lang.code, dict } : null;
  });
  const [loadError, setLoadError] = useState<{ code: string; message: string } | null>(null);
  const dict = loaded?.code === lang.code ? loaded.dict : {};
  const ready = loaded?.code === lang.code;
  const missingKeys = useMemo(() => ready ? getMissingTranslationKeys(lang.code, dict) : [], [ready, lang.code, dict]);

  useEffect(() => {
    let alive = true;
    ensureScriptFonts("latin");
    ensureScriptFonts(lang.script);
    setLoadError(null);
    loadDict(lang.code).then(
      (d) => {
        if (alive) setLoaded({ code: lang.code, dict: d });
      },
      (error: unknown) => {
        if (alive) {
          setLoadError({
            code: lang.code,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );
    const f = SCRIPT_FONTS[lang.script];
    const root = document.documentElement;
    root.lang = lang.code;
    root.dir = lang.rtl ? "rtl" : "ltr";
    root.style.setProperty("--font-script", `'${f.body}'`);
    root.style.setProperty("--font-display-ui", lang.script === "latin" ? "'Playfair Display'" : `'${f.display}'`);
    return () => {
      alive = false;
    };
  }, [lang.code, lang.script, lang.rtl]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      return format(getTranslation(lang.code, key, dict), vars);
    },
    [dict, lang.code],
  );
  const occ = useCallback(
    (o: Occasion, field: "name" | "headline" | "message") => {
      const key = `occ.${o.id}.${field}`;
      return getTranslation(lang.code, key, dict);
    },
    [dict, lang.code],
  );
  const fonts = useMemo(() => {
    const f = SCRIPT_FONTS[lang.script];
    return { display: f.display, body: f.body };
  }, [lang.script]);

  if (loadError?.code === lang.code) {
    return (
      <div role="alert" className="mx-auto mt-12 max-w-xl rounded-2xl border border-destructive/30 bg-card p-6 text-sm">
        <h1 className="text-lg font-bold">Unable to load the {lang.name} translation.</h1>
        <p className="mt-2">{loadError.message}</p>
        <a className="mt-4 inline-block font-semibold text-primary" href="#/">Return to language selection</a>
      </div>
    );
  }

  if (!ready) {
    return (
      <div role="status" className="mx-auto mt-12 max-w-xl rounded-2xl border border-border bg-card p-6 text-sm">
        Loading translation for <span lang={lang.code}>{lang.native}</span>…
      </div>
    );
  }

  if (missingKeys.length === Object.keys(EN).length) {
    return (
      <div className="mx-auto mt-12 max-w-xl">
        <TranslationNotice lang={lang} missingKeys={missingKeys} blocking />
      </div>
    );
  }

  const value = { lang, ready, missingKeys, t, occ, fonts };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function TranslationNotice({
  lang,
  missingKeys,
  blocking = false,
}: {
  lang: Language;
  missingKeys: string[];
  blocking?: boolean;
}) {
  if (missingKeys.length === 0) return null;
  return (
    <aside role="status" className="mx-auto w-full max-w-3xl rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-950">
      <p>
        {blocking
          ? `The ${lang.name} (${lang.code}) interface is unavailable because its locale is an English copy.`
          : `${lang.name} (${lang.code}) has ${missingKeys.length} untranslated or English-identical interface key(s).`}
        {" "}Those values are identified by key instead of being presented as translations.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer font-semibold">View missing translation keys ({missingKeys.length})</summary>
        <ul className="mt-2 max-h-48 list-inside list-disc overflow-auto font-mono text-xs">
          {missingKeys.map((key) => <li key={key}>{key}</li>)}
        </ul>
      </details>
      {blocking && <a className="mt-3 inline-block font-semibold underline" href="#/">Return to language selection</a>}
    </aside>
  );
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside provider");
  return c;
}

/** Normalise text for search (lower-case, strip accents/punctuation) */
export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'`".,()/&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
