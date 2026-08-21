import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PRIVATE_IMAGE_DIR = path.resolve(process.cwd(), ".private-images");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DATA_URI_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i;
const KEY_RE = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;

function extensionForMimeType(mimeType: string) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}

function matchesImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return buffer.length >= 12 && buffer.subarray(0, 4).equals(Buffer.from("RIFF")) && buffer.subarray(8, 12).equals(Buffer.from("WEBP"));
}

export async function savePrivateImage(image: string) {
  const match = image.match(DATA_URI_RE);
  if (!match) throw new Error("Only PNG, JPEG, and WebP image data is accepted");

  const mimeType = match[1].toLowerCase();
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES || !matchesImageSignature(buffer, mimeType)) {
    throw new Error("Invalid or oversized image upload");
  }

  await mkdir(PRIVATE_IMAGE_DIR, { recursive: true, mode: 0o700 });
  const storageKey = `${randomUUID()}.${extensionForMimeType(mimeType)}`;
  await writeFile(path.join(PRIVATE_IMAGE_DIR, storageKey), buffer, { mode: 0o600, flag: "wx" });
  return { storageKey, mimeType };
}

export async function readPrivateImage(storageKey: string) {
  if (!KEY_RE.test(storageKey)) throw new Error("Invalid image key");
  return readFile(path.join(PRIVATE_IMAGE_DIR, storageKey));
}