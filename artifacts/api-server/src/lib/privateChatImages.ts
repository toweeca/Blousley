import { Storage } from "@google-cloud/storage";
import type { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

const SIDECAR_URL = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR_URL}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR_URL}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const CHAT_IMAGE_KEY_RE = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;

function privateChatImageFile(storageKey: string) {
  if (!CHAT_IMAGE_KEY_RE.test(storageKey)) throw new Error("Invalid chat image key");
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) throw new Error("Private object storage is not configured");

  const normalized = privateDir.startsWith("gs://")
    ? `/${new URL(privateDir).host}${new URL(privateDir).pathname}`
    : `/${privateDir.replace(/^\/+/, "")}`;
  const [bucketName, ...prefixParts] = normalized.split("/").filter(Boolean);
  if (!bucketName) throw new Error("Private object storage path is invalid");

  const objectName = [
    ...prefixParts,
    "chat-images",
    storageKey,
  ].join("/");
  return storage.bucket(bucketName).file(objectName);
}

export async function savePrivateChatObject(storageKey: string, bytes: Buffer, mimeType: string) {
  await privateChatImageFile(storageKey).save(bytes, {
    resumable: false,
    validation: "crc32c",
    metadata: { contentType: mimeType, cacheControl: "private, no-store" },
  });
}

export async function readPrivateChatObject(storageKey: string): Promise<Buffer | null> {
  const file = privateChatImageFile(storageKey);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [bytes] = await file.download();
  return bytes;
}

export async function privateChatObjectExists(storageKey: string) {
  const [exists] = await privateChatImageFile(storageKey).exists();
  return exists;
}

export async function deletePrivateChatObject(storageKey: string) {
  await privateChatImageFile(storageKey).delete({ ignoreNotFound: true });
}

export async function migratePrivateChatObject(storageKey: string, bytes: Buffer, mimeType: string) {
  const file = privateChatImageFile(storageKey);
  const [exists] = await file.exists();
  if (exists) return false;
  await savePrivateChatObject(storageKey, bytes, mimeType);
  return true;
}

export function newPrivateChatImageKey(extension: "jpg" | "png" | "webp") {
  return `${randomUUID()}.${extension}`;
}

export function privateChatImageMimeType(storageKey: string) {
  if (!CHAT_IMAGE_KEY_RE.test(storageKey)) throw new Error("Invalid chat image key");
  return storageKey.endsWith(".jpg")
    ? "image/jpeg"
    : storageKey.endsWith(".png")
      ? "image/png"
      : "image/webp";
}
