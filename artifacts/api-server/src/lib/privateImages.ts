import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const PRIVATE_IMAGE_DIR = path.resolve(process.cwd(), ".private-images");
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const MAX_UPLOADS_PER_USER = 20;
const DATA_URI_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i;
const SVG_DATA_URI_RE = /^data:image\/svg\+xml;base64,([A-Za-z0-9+/=\s]+)$/i;
const KEY_RE = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;
const uploadBuckets = new Map<string, { startedAt: number; count: number }>();

function extensionForMimeType(mimeType: string) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}

function matchesImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return buffer.length >= 12 && buffer.subarray(0, 4).equals(Buffer.from("RIFF")) && buffer.subarray(8, 12).equals(Buffer.from("WEBP"));
}

function detectedMimeType(buffer: Buffer) {
  return ["image/jpeg", "image/png", "image/webp"].find((mimeType) => matchesImageSignature(buffer, mimeType)) ?? null;
}

export function imageDataUriFromBase64(base64: string) {
  const dataUri = base64.match(DATA_URI_RE);
  const declaredMimeType = dataUri?.[1]?.toLowerCase();
  const encoded = dataUri ? dataUri[2] : base64;
  if (!dataUri && !/^[A-Za-z0-9+/=\s]+$/.test(encoded)) throw new Error("Invalid image data");
  const normalized = encoded.replace(/\s/g, "");
  const buffer = Buffer.from(normalized, "base64");
  const mimeType = detectedMimeType(buffer);
  if (!mimeType || (declaredMimeType && declaredMimeType !== mimeType) || !buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Invalid or oversized image upload");
  }
  return `data:${mimeType};base64,${normalized}`;
}

export async function savePrivateImage(
  image: string,
  userId: string,
  originalName?: string,
  options?: { format?: "png" },
) {
  const match = image.match(DATA_URI_RE);
  const svgMatch = image.match(SVG_DATA_URI_RE);
  if (!match && !svgMatch) throw new Error("Only PNG, JPEG, WebP, and SVG image data is accepted");

  const sourceMimeType = svgMatch ? "image/png" : match![1].toLowerCase();
  const mimeType = options?.format === "png" ? "image/png" : sourceMimeType;
  const extension = originalName?.toLowerCase().split(".").pop();
  if (originalName && (!extension || !["jpg", "jpeg", "png", "webp"].includes(extension))) {
    throw new Error("Invalid image extension");
  }
  const sourceBuffer = Buffer.from((svgMatch ? svgMatch[1] : match![2]).replace(/\s/g, ""), "base64");
  if (!sourceBuffer.length || sourceBuffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Invalid or oversized image upload");
  }

  const now = Date.now();
  const bucket = uploadBuckets.get(userId);
  if (!bucket || now - bucket.startedAt >= UPLOAD_WINDOW_MS) {
    uploadBuckets.set(userId, { startedAt: now, count: 1 });
  } else {
    bucket.count += 1;
    if (bucket.count > MAX_UPLOADS_PER_USER) throw new Error("Upload limit exceeded");
  }

  let sanitizedBuffer: Buffer;
  try {
    sanitizedBuffer = await sharp(sourceBuffer, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })[mimeType === "image/jpeg" ? "jpeg" : mimeType === "image/png" ? "png" : "webp"]().toBuffer();
  } catch {
    throw new Error("Invalid image upload");
  }
  if (!sanitizedBuffer.length || sanitizedBuffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Invalid or oversized image upload");
  }

  await mkdir(PRIVATE_IMAGE_DIR, { recursive: true, mode: 0o700 });
  const storageKey = `${randomUUID()}.${extensionForMimeType(mimeType)}`;
  await writeFile(path.join(PRIVATE_IMAGE_DIR, storageKey), sanitizedBuffer, { mode: 0o600, flag: "wx" });
  console.info("image_upload", { userId, mimeType, size: sanitizedBuffer.length });
  return { storageKey, mimeType };
}

export async function normalizeLegacyImageDataUri(image: string) {
  const match = image.match(SVG_DATA_URI_RE);
  if (!match) return image;
  try {
    const png = await sharp(Buffer.from(match[1].replace(/\s/g, ""), "base64"), {
      failOn: "error",
      limitInputPixels: 40_000_000,
    }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function readPrivateImage(storageKey: string) {
  if (!KEY_RE.test(storageKey)) throw new Error("Invalid image key");
  return readFile(path.join(PRIVATE_IMAGE_DIR, storageKey));
}