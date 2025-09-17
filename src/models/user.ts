import { users } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, gte, inArray } from "drizzle-orm";

export async function insertUser(
  data: typeof users.$inferInsert
): Promise<typeof users.$inferSelect | undefined> {
  try {
    console.log("insertUser: attempting to insert user", { email: data.email, uuid: data.uuid });
    
    const [user] = await db().insert(users).values(data).returning();
    
    console.log("insertUser: user inserted successfully", { uuid: user?.uuid, email: user?.email });
    return user;
  } catch (e) {
    console.error("insertUser: failed to insert user:", e);
    console.error("insertUser: error details", {
      email: data?.email,
      uuid: data?.uuid,
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
      errorStack: e instanceof Error ? e.stack : 'No stack trace'
    });
    throw e;
  }
}

export async function findUserByEmail(
  email: string
): Promise<typeof users.$inferSelect | undefined> {
  try {
    console.log("findUserByEmail: searching for user", { email });
    
    const [user] = await db()
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    console.log("findUserByEmail: search completed", { 
      email, 
      found: !!user, 
      userUuid: user?.uuid 
    });
    return user;
  } catch (e) {
    console.error("findUserByEmail: failed to find user:", e);
    console.error("findUserByEmail: error details", {
      email,
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
      errorStack: e instanceof Error ? e.stack : 'No stack trace'
    });
    throw e;
  }
}

export async function findUserByUuid(
  uuid: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.uuid, uuid))
    .limit(1);

  return user;
}

export async function getUsers(
  page: number = 1,
  limit: number = 50
): Promise<(typeof users.$inferSelect)[] | undefined> {
  const offset = (page - 1) * limit;

  const data = await db()
    .select()
    .from(users)
    .orderBy(desc(users.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function updateUserInviteCode(
  user_uuid: string,
  invite_code: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .update(users)
    .set({ invite_code, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid))
    .returning();

  return user;
}

export async function updateUserInvitedBy(
  user_uuid: string,
  invited_by: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .update(users)
    .set({ invited_by, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid))
    .returning();

  return user;
}

export async function getUsersByUuids(
  user_uuids: string[]
): Promise<(typeof users.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(users)
    .where(inArray(users.uuid, user_uuids));

  return data;
}

export async function findUserByInviteCode(
  invite_code: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.invite_code, invite_code))
    .limit(1);

  return user;
}

export async function getUserUuidsByEmail(
  email: string
): Promise<string[] | undefined> {
  const data = await db()
    .select({ uuid: users.uuid })
    .from(users)
    .where(eq(users.email, email));

  return data.map((user) => user.uuid);
}

export async function getUsersTotal(): Promise<number> {
  const total = await db().$count(users);

  return total;
}

export async function getUserCountByDate(
  startTime: string
): Promise<Map<string, number> | undefined> {
  const data = await db()
    .select({ created_at: users.created_at })
    .from(users)
    .where(gte(users.created_at, new Date(startTime)));

  data.sort((a, b) => a.created_at!.getTime() - b.created_at!.getTime());

  const dateCountMap = new Map<string, number>();
  data.forEach((item) => {
    const date = item.created_at!.toISOString().split("T")[0];
    dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
  });

  return dateCountMap;
}
