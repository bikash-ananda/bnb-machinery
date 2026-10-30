import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export class BackendNotConfiguredError extends Error {
  constructor() { super("The PostgreSQL media backend is not configured."); this.name = "BackendNotConfiguredError"; }
}
function root() {
  const dir = process.env.MEDIA_DIR?.trim() || "/data/media";
  if (!path.isAbsolute(dir) && process.env.NODE_ENV === "production") throw new BackendNotConfiguredError();
  return path.resolve(dir);
}
function safePath(relative: string) {
  if (!relative || relative.includes("\\") || relative.startsWith("/") || relative.split("/").some((p) => !p || p === "." || p === "..")) throw new Error("Invalid media path.");
  const base = root(), target = path.resolve(base, relative);
  if (!target.startsWith(base + path.sep)) throw new Error("Invalid media path.");
  return target;
}
export async function uploadPrivateImage(relative: string, bytes: Buffer, mimeType: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType) || bytes.length === 0 || bytes.length > 25 * 1024 * 1024) throw new Error("Unsupported image.");
  const target = safePath(relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx", mode: 0o640 });
}
export async function downloadPrivateImage(relative: string) {
  const bytes = await readFile(safePath(relative));
  const ext = path.extname(relative).toLowerCase();
  const contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "application/octet-stream";
  return { bytes, contentType };
}
export async function deletePrivateImages(paths: string[]) {
  for (const relative of paths) await rm(safePath(relative), { force: true });
}
