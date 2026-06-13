// Renders assets/icon.svg into the PNG icons the PWA manifest + iOS need.
// Run with: npm run gen-icons
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "assets/icon.svg"), "utf8");
mkdirSync(resolve(root, "public"), { recursive: true });

const render = (size) =>
  new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();

const targets = [
  ["public/pwa-192.png", 192],
  ["public/pwa-512.png", 512],
  ["public/maskable-512.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["public/favicon-32.png", 32],
];

for (const [file, size] of targets) {
  writeFileSync(resolve(root, file), render(size));
  console.log(`wrote ${file} (${size}px)`);
}
