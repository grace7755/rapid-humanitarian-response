import { eq } from "drizzle-orm";

import { db } from "../index";
import { user } from "../schema";

export async function getUserById(userId: string) {
  const [record] = await db
    .select({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return record ?? null;
}
