import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { LANGUAGES, SCRIPT_FONTS } from "../client/src/i18n/languages";
import { isIdentityTranslationKey } from "../client/src/i18n/identity-keys";
import { OCCASIONS } from "../client/src/data/occasions";

const localeDir = path.resolve("client/src/i18n/locales");

export async function validateLocaleCoverage() {
  const enPath = path.join(localeDir, "en.json");
  const base = JSON.parse(await readFile(enPath, "utf-8")) as Record<string, string>;
  const sourceMetadataPath = path.resolve("client/src/i18n/locale-translation-sources.json");
  const sourceMetadata = JSON.parse(await readFile(sourceMetadataPath, "utf-8")) as {
    provider?: unknown;
    locales?: Record<string, { model?: unknown; exactModel?: unknown }>;
  };
  const translationSources = sourceMetadata.locales ?? {};

  const files = (await readdir(localeDir)).filter((entry) => entry.endsWith(".json")).sort();
  const problems: string[] = [];
  const dynamicRegionKeys = new Set(OCCASIONS.flatMap((occasion) => occasion.regions.map((region) => `region.${region}`)));
  const dynamicOccasionKeys = new Set(OCCASIONS.flatMap((occasion) => (
    (["name", "headline", "message"] as const).map((field) => `occ.${occasion.id}.${field}`)
  )));
  const codes = new Set<string>();
  const incomplete: { code: string; keys: string[] }[] = [];

  for (const language of LANGUAGES) {
    if (codes.has(language.code)) {
      problems.push(`Duplicate language code: ${language.code}`);
    }
    codes.add(language.code);
    if (!SCRIPT_FONTS[language.script]) {
      problems.push(`${language.code}: no font configuration for script ${language.script}`);
    }
    if (language.script !== "latin" && !/[^\u0000-\u007f]/.test(language.native)) {
      problems.push(`${language.code}: native display name is missing Unicode characters for ${language.script}`);
    }

    const file = `${language.code}.json`;
    if (!files.includes(file)) {
      problems.push(`${language.code}: missing locale file ${file}`);
      continue;
    }
    const data = JSON.parse(await readFile(path.join(localeDir, file), "utf-8")) as Record<string, string>;
    const missingKeys = Object.keys(base).filter((key) => !(key in data));

    if (missingKeys.length > 0) {
      problems.push(`${language.code}: missing ${missingKeys.length} key(s): ${missingKeys.join(", ")}`);
      continue;
    }
    const invalidValues = Object.keys(base).filter((key) => typeof data[key] !== "string" || !data[key].trim());
    if (invalidValues.length > 0) {
      problems.push(`${language.code}: empty or non-string values for ${invalidValues.join(", ")}`);
      continue;
    }

    if (language.code !== "en") {
      const source = translationSources[language.code];
      if (!source || typeof source.model !== "string" || typeof source.exactModel !== "boolean") {
        problems.push(`${language.code}: missing or invalid translation-model metadata`);
      }
    }

    const placeholderMismatches = Object.keys(base).filter((key) => {
      const expected = base[key].match(/\{\w+\}/g) ?? [];
      const actual = data[key].match(/\{\w+\}/g) ?? [];
      return expected.length !== actual.length || expected.some((value, index) => value !== actual[index]);
    });
    if (placeholderMismatches.length > 0) {
      problems.push(`${language.code}: interpolation placeholders differ for ${placeholderMismatches.join(", ")}`);
    }

    const untranslatedKeys = language.code === "en"
      ? []
      : Object.keys(base).filter((key) => (
        !data[key]?.trim()
        || (data[key] === base[key] && !isIdentityTranslationKey(key, base[key]))
      ));
    if (untranslatedKeys.length > 0) {
      incomplete.push({ code: language.code, keys: untranslatedKeys });
    }
  }

  const registeredCodes = new Set(LANGUAGES.map((language) => language.code));
  for (const file of files) {
    const code = path.basename(file, ".json");
    if (!registeredCodes.has(code)) {
      problems.push(`${file}: locale file is not registered in the language selector`);
    }
  }

  for (const key of dynamicRegionKeys) {
    if (!(key in base)) {
      problems.push(`English base dictionary is missing dynamic region key ${key}`);
    }
  }
  for (const key of dynamicOccasionKeys) {
    if (!(key in base)) {
      problems.push(`English base dictionary is missing dynamic occasion key ${key}`);
    }
  }

  if (typeof sourceMetadata.provider !== "string" || !sourceMetadata.provider.trim()) {
    problems.push("Translation-model metadata is missing its provider and review status.");
  }
  for (const code of Object.keys(translationSources)) {
    if (!codes.has(code)) {
      problems.push(`Translation-model metadata contains unregistered language code: ${code}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Locale coverage validation failed:\n- ${problems.join("\n- ")}`);
  }

  const completeCount = LANGUAGES.length - incomplete.length;
  console.log(`Validated ${LANGUAGES.length} language codes, locale files, script fonts, and ${Object.keys(base).length} UI keys.`);
  console.log(`${completeCount} locales have no unapproved English-identical UI values; ${incomplete.length} locales are explicitly incomplete.`);
  const approximateCodes = Object.entries(translationSources)
    .filter(([, source]) => source.exactModel === false)
    .map(([code]) => code);
  console.log(`${Object.keys(translationSources).length - approximateCodes.length} locales use a matching translation model; ${approximateCodes.length} use an explicitly mapped approximate model.`);
  console.log(`Translation provider/review status: ${sourceMetadata.provider}`);
  const englishClones = incomplete.filter((locale) => locale.keys.length === Object.keys(base).length);
  for (const locale of incomplete) {
    const allEnglish = locale.keys.length === Object.keys(base).length;
    console.log(`${locale.code}: ${locale.keys.length}/${Object.keys(base).length} untranslated keys${allEnglish ? " (complete English clone)" : `: ${locale.keys.join(", ")}`}`);
  }
  if (englishClones.length > 0) {
    console.log(`Every key listed in the English base dictionary is missing from translation for these English-clone locales: ${englishClones.map((locale) => locale.code).join(", ")}`);
    console.log(`English base keys (${Object.keys(base).length}): ${Object.keys(base).join(", ")}`);
  }
  const rtlScripts = { ur: "nastaliq", ks: "arabic", sd: "arabic" };
  for (const [code, script] of Object.entries(rtlScripts)) {
    const language = LANGUAGES.find((entry) => entry.code === code);
    if (!language?.rtl || language.script !== script) {
      throw new Error(`${code}: expected right-to-left ${script} configuration`);
    }
  }
  console.log("Right-to-left metadata, native Unicode names, and script font registrations validated.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  validateLocaleCoverage().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
