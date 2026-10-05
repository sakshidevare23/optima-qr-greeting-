import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { OCCASIONS } from "../client/src/data/occasions";
import { templatesFor } from "../client/src/lib/render";

const providedDir = path.resolve("client/public/art/provided");
const requiredArt = [
  "corporate-navy.png",
  "diwali-lamps.png",
  "floral-frame.png",
  "ganesh.png",
  "harvest-pot.png",
  "holi-powder.png",
  "marigold.png",
  "midnight-gold.png",
  "tricolor-arch.png",
  "tricolor-corner.png",
  "wedding-rings.png",
];

export async function validateTemplates() {
  const errors: string[] = [];
  let nationalReferences: string[] | undefined;

  for (const occasion of OCCASIONS) {
    const templates = templatesFor(occasion);
    const existing = templates.slice(0, 5);
    const references = templates.slice(5);
    const expectedReferenceCount = occasion.category === "national" ? 2 : 1;

    if (existing.length !== 5 || references.length !== expectedReferenceCount) {
      errors.push(`${occasion.id}: expected 5 existing templates plus ${expectedReferenceCount} reference template(s)`);
    }
    if (templates.some((template, index) => index < 5 && template.background)) {
      errors.push(`${occasion.id}: a provided background replaced an existing template`);
    }

    const referencePaths = references.map((template) => template.background ?? "");
    if (occasion.category === "national") {
      if (!nationalReferences) nationalReferences = referencePaths;
      else if (referencePaths.some((source, index) => source !== nationalReferences?.[index])) {
        errors.push(`${occasion.id}: national reference designs differ from the shared national set`);
      }
    }

    for (const template of references) {
      if (!template.background?.startsWith("./art/provided/")) {
        errors.push(`${template.id}: missing provided background`);
        continue;
      }
      const file = template.background.slice("./art/provided/".length);
      const { x, y, w, h } = template.backgroundSafeArea ?? { x: -1, y: -1, w: 0, h: 0 };
      if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1) {
        errors.push(`${template.id}: invalid safe area`);
      }
      try {
        await access(path.join(providedDir, file));
      } catch {
        errors.push(`${template.id}: reference image is missing (${file})`);
      }
    }
  }

  if (errors.length) throw new Error(`Template validation failed:\n- ${errors.join("\n- ")}`);
  console.log(`Validated ${OCCASIONS.length} occasions; existing choices remain, with occasion-matched reference designs added.`);
  console.log(`All ${requiredArt.length} supplied reference files exist and safe areas are within bounds.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  validateTemplates().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
