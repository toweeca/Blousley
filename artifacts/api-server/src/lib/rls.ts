import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const USER_ID_RE = /^user_\d+_[a-z0-9]{4,12}$/;

export function isValidUserId(value: unknown): value is string {
  return typeof value === "string" && USER_ID_RE.test(value);
}

export async function withRlsUser<T>(userId: string, work: (tx: any) => Promise<T>) {
  if (!isValidUserId(userId)) throw new Error("Invalid user identity");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return work(tx);
  });
}