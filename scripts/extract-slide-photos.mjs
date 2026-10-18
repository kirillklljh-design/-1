// Deterministic SVG viewports preserve the exact supplied screenshot pixels.
// No image generation, reconstruction or retouching is performed.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error("Usage: node scripts/extract-slide-photos.mjs <screenshots-directory>");
const sources = {
  hero: "codex-clipboard-5f88f581-8799-4c6b-92f6-964f8c9b964c.png",
  fleet: "codex-clipboard-cd06ce63-e26d-4409-933c-c7d255901e51.png",
  owner: "codex-clipboard-86c232a2-53d1-4817-b42e-bf5fdf231e4a.png",
};
const crops = [
  { name: "hero", source: "hero", x: 650, y: 80, width: 486, height: 407 },
  { name: "mini", source: "owner", x: 43, y: 435, width: 123, height: 97 },
  { name: "excavator", source: "fleet", x: 337, y: 260, width: 291, height: 160 },
  { name: "loader", source: "fleet", x: 652, y: 260, width: 290, height: 160 },
  { name: "truck", source: "fleet", x: 966, y: 260, width: 289, height: 160 },
];
await mkdir("public/assets/photos", { recursive: true });
for (const crop of crops) {
  const png = await readFile(path.join(sourceDirectory, sources[crop.source]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}"><image width="1280" height="720" href="data:image/png;base64,${png.toString("base64")}"/></svg>\n`;
  await writeFile(`public/assets/photos/${crop.name}.svg`, svg);
}
console.log(`Saved ${crops.length} original photograph viewports to public/assets/photos/`);
