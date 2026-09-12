import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

const jobs = [
  ["src/icons/icon.svg", "public/icons/icon-192.png", 192],
  ["src/icons/icon.svg", "public/icons/icon-512.png", 512],
  ["src/icons/icon-maskable.svg", "public/icons/icon-maskable-192.png", 192],
  ["src/icons/icon-maskable.svg", "public/icons/icon-maskable-512.png", 512],
  ["src/icons/icon.svg", "public/favicon-32.png", 32],
  ["src/icons/icon.svg", "public/apple-touch-icon.png", 180],
];

for (const [src, dest, size] of jobs) {
  await sharp(src).resize(size, size).png().toFile(dest);
  console.log("wrote", dest);
}
