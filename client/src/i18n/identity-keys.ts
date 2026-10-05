const unchangedHeadlineNames = new Set([
  "Muharram Mubarak",
  "Shab-e-Barat Mubarak",
  "Shab-e-Miraj Mubarak",
  "Laylat-ul-Qadr Mubarak",
  "Mahamastakabhisheka",
  "Zarthost No Deeso",
  "Michhami Dukkadam",
  "Navroz Mubarak",
  "Shubho Noboborsho",
  "Nuakhai Juhar",
]);

export function isIdentityTranslationKey(key: string, englishValue: string) {
  return key === "result.email"
    || key === "result.facebook"
    || key.startsWith("region.")
    || /^occ\.[^.]+\.name$/.test(key)
    || (key.endsWith(".headline") && unchangedHeadlineNames.has(englishValue));
}
