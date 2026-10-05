import type { Occasion, ThemeKey } from "@/data/occasions";

export interface ProvidedTemplate {
  key: string;
  src: string;
  safeArea: { x: number; y: number; w: number; h: number };
  dark?: boolean;
}

const art = (key: string, safeArea: ProvidedTemplate["safeArea"], dark = false): ProvidedTemplate => ({
  key,
  src: `./art/provided/${key}.png`,
  safeArea,
  dark,
});

const ART: Record<string, ProvidedTemplate> = {
  "diwali-lamps": art("diwali-lamps", { x: 0.1, y: 0.34, w: 0.8, h: 0.46 }, true),
  "tricolor-corner": art("tricolor-corner", { x: 0.11, y: 0.14, w: 0.76, h: 0.57 }),
  "harvest-pot": art("harvest-pot", { x: 0.36, y: 0.1, w: 0.56, h: 0.72 }),
  ganesh: art("ganesh", { x: 0.1, y: 0.53, w: 0.8, h: 0.32 }),
  marigold: art("marigold", { x: 0.12, y: 0.18, w: 0.74, h: 0.48 }),
  "midnight-gold": art("midnight-gold", { x: 0.1, y: 0.12, w: 0.8, h: 0.55 }, true),
  "corporate-navy": art("corporate-navy", { x: 0.17, y: 0.13, w: 0.66, h: 0.62 }),
  "holi-powder": art("holi-powder", { x: 0.11, y: 0.2, w: 0.78, h: 0.56 }),
  "floral-frame": art("floral-frame", { x: 0.13, y: 0.12, w: 0.74, h: 0.7 }),
  "wedding-rings": art("wedding-rings", { x: 0.13, y: 0.1, w: 0.74, h: 0.58 }),
  "tricolor-arch": art("tricolor-arch", { x: 0.13, y: 0.11, w: 0.74, h: 0.57 }),
};

const THEME_ART: Record<ThemeKey, string> = {
  diwali: "diwali-lamps",
  holi: "holi-powder",
  newyear: "midnight-gold",
  birthday: "floral-frame",
  anniversary: "wedding-rings",
  harvest: "harvest-pot",
  devotional: "ganesh",
  eid: "midnight-gold",
  christmas: "midnight-gold",
  national: "tricolor-arch",
  floral: "marigold",
  royal: "corporate-navy",
  toran: "marigold",
  lotus: "marigold",
};

const OCCASION_ART: Record<string, string> = {
  birthday: "floral-frame",
  anniversary: "wedding-rings",
  wedding: "wedding-rings",
  "business-anniversary": "corporate-navy",
  "housewarming": "marigold",
  diwali: "diwali-lamps",
  dhanteras: "diwali-lamps",
  "diwali-padwa": "diwali-lamps",
  "bhai-dooj": "diwali-lamps",
  "karthigai-deepam": "diwali-lamps",
  holi: "holi-powder",
  "ganesh-chaturthi": "ganesh",
  navratri: "marigold",
  onam: "marigold",
  pongal: "harvest-pot",
  "makar-sankranti": "harvest-pot",
  "eid-ul-fitr": "midnight-gold",
  "eid-ul-adha": "midnight-gold",
  "milad-un-nabi": "midnight-gold",
  muharram: "midnight-gold",
  ramadan: "midnight-gold",
};

const NATIONAL_ART = ["tricolor-arch", "tricolor-corner"] as const;

export function providedTemplatesFor(occasion: Occasion): ProvidedTemplate[] {
  if (occasion.category === "national") return NATIONAL_ART.map((key) => ART[key]);
  return [ART[OCCASION_ART[occasion.id] ?? THEME_ART[occasion.theme]]];
}
