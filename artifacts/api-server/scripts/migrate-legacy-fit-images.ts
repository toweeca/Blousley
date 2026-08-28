import { unlink } from "node:fs/promises";
import path from "node:path";
import { desc, eq, isNotNull } from "drizzle-orm";
import { blouseFitsTable, db, privateImages } from "@workspace/db";
import { savePrivateImage } from "../src/lib/privateImages";
import { isValidUserId, withRlsUser } from "../src/lib/rls";

const privateImageDir = path.resolve(process.cwd(), ".private-images");

const legacyFits = await db
  .select({ fit: blouseFitsTable })
  .from(blouseFitsTable)
  .where(isNotNull(blouseFitsTable.imageUrl))
  .orderBy(desc(blouseFitsTable.id));

const migrated: number[] = [];
const repaired: number[] = [];
const skipped: { fitId: number; reason: string }[] = [];
const failed: { fitId: number; error: string }[] = [];

for (const { fit } of legacyFits) {
  if (!fit.imageUrl) continue;

  try {
    if (!isValidUserId(fit.userId)) {
      skipped.push({ fitId: fit.id, reason: `invalid owner id: ${fit.userId}` });
      continue;
    }

    const privateImage = await withRlsUser(fit.userId, async (tx) => {
      const [row] = await tx
        .select({ id: privateImages.id })
        .from(privateImages)
        .where(eq(privateImages.fitId, fit.id))
        .limit(1);
      return row;
    });

    if (privateImage) {
      if (fit.thumbnailUrl !== `/api/images/fits/${fit.id}`) {
        await db
          .update(blouseFitsTable)
          .set({ thumbnailUrl: `/api/images/fits/${fit.id}`, updatedAt: new Date() })
          .where(eq(blouseFitsTable.id, fit.id));
        repaired.push(fit.id);
      } else {
        skipped.push({ fitId: fit.id, reason: "already migrated" });
      }
      continue;
    }

    const saved = await savePrivateImage(fit.imageUrl, fit.userId, undefined, { format: "png" });
    try {
      await withRlsUser(fit.userId, async (tx) => {
        await tx.insert(privateImages).values({
          fitId: fit.id,
          ownerId: fit.userId,
          storageKey: saved.storageKey,
          mimeType: saved.mimeType,
        });
        await tx
          .update(blouseFitsTable)
          .set({ thumbnailUrl: `/api/images/fits/${fit.id}`, updatedAt: new Date() })
          .where(eq(blouseFitsTable.id, fit.id));
      });
      migrated.push(fit.id);
    } catch (error) {
      await unlink(path.join(privateImageDir, saved.storageKey)).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    failed.push({
      fitId: fit.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.log(JSON.stringify({ migrated, repaired, skipped, failed }, null, 2));
await db.$client.end();
if (failed.length) process.exitCode = 1;