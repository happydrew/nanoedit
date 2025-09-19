import { CreditsAmount, CreditsTransType } from "./credit";
import { findUserByEmail, findUserByUuid, insertUser } from "@/models/user";

import { User } from "@/types/user";
import { auth } from "@/auth";
import { getIsoTimestr, getOneYearLaterTimestr } from "@/lib/time";
import { getUserUuidByApiKey } from "@/models/apikey";
import { headers } from "next/headers";
import { increaseCredits } from "./credit";
import { users } from "@/db/schema";
import { getUuid } from "@/lib/hash";

// save user to database, if user not exist, create a new user
export async function saveUser(user: User) {
  try {
    console.log("saveUser: starting with user", { email: user.email, uuid: user.uuid });
    
    if (!user.email) {
      console.error("saveUser: invalid user email");
      throw new Error("invalid user email");
    }

    console.log("saveUser: checking if user exists by email", { email: user.email });
    const existUser = await findUserByEmail(user.email);
    console.log("saveUser: existing user check result", { found: !!existUser, existingUuid: existUser?.uuid });

    if (!existUser) {
      // user not exist, create a new user
      if (!user.uuid) {
        user.uuid = getUuid();
        console.log("saveUser: generated new UUID", { uuid: user.uuid });
      }

      console.log("saveUser: inserting new user to database", user);

      const dbUser = await insertUser(user as typeof users.$inferInsert);
      console.log("saveUser: user inserted successfully", { uuid: dbUser?.uuid, email: dbUser?.email });

      console.log("saveUser: increasing credits for new user", { user_uuid: user.uuid });
      // increase credits for new user, expire in one year
      await increaseCredits({
        user_uuid: user.uuid,
        trans_type: CreditsTransType.NewUser,
        credits: CreditsAmount.NewUserGet,
        expired_at: getOneYearLaterTimestr(),
      });
      console.log("saveUser: credits increased successfully");

      user = {
        ...(dbUser as unknown as User),
      };
    } else {
      // user exist, return user info in db
      console.log("saveUser: user exists, returning existing user", { uuid: existUser.uuid });
      user = {
        ...(existUser as unknown as User),
      };
    }

    console.log("saveUser: completed successfully", { uuid: user.uuid, email: user.email });
    return user;
  } catch (e) {
    console.error("saveUser: failed with error:", e);
    console.error("saveUser: error details", {
      userEmail: user?.email,
      userUuid: user?.uuid,
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
      errorStack: e instanceof Error ? e.stack : 'No stack trace'
    });
    throw e;
  }
}

export async function getUserUuid() {
  let user_uuid = "";

  const token = await getBearerToken();

  if (token) {
    // api key
    if (token.startsWith("sk-")) {
      const user_uuid = await getUserUuidByApiKey(token);

      return user_uuid || "";
    }
  }

  const session = await auth();
  if (session && session.user && session.user.uuid) {
    user_uuid = session.user.uuid;
  }

  return user_uuid;
}

export async function getBearerToken() {
  const h = await headers();
  const auth = h.get("Authorization");
  if (!auth) {
    return "";
  }

  return auth.replace("Bearer ", "");
}

export async function getUserEmail() {
  let user_email = "";

  const session = await auth();
  if (session && session.user && session.user.email) {
    user_email = session.user.email;
  }

  return user_email;
}

export async function getUserInfo() {
  let user_uuid = await getUserUuid();

  if (!user_uuid) {
    return;
  }

  const user = await findUserByUuid(user_uuid);

  return user;
}

export async function checkIsAdmin(email?: string) {
  if (!email) {
    const userEmail = await getUserEmail();
    email = userEmail;
  }

  if (!email) {
    return false;
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(",");
  return adminEmails?.includes(email) || false;
}
