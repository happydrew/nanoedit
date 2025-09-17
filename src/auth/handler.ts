import { AdapterUser } from "next-auth/adapters";
import { Account, User } from "next-auth";
import { getUuid } from "@/lib/hash";
import { getIsoTimestr } from "@/lib/time";
import { saveUser } from "@/services/user";
import { User as UserType } from "@/types/user";
import { getClientIp } from "@/lib/ip";

export async function handleSignInUser(
  user: User | AdapterUser,
  account: Account
): Promise<UserType | null> {
  try {
    console.log("handleSignInUser: starting", { email: user.email, provider: account.provider });
    
    if (!user.email) {
      console.error("handleSignInUser: user email is missing");
      throw new Error("invalid signin user - missing email");
    }
    if (!account.type || !account.provider || !account.providerAccountId) {
      console.error("handleSignInUser: account info incomplete", { 
        type: account.type, 
        provider: account.provider, 
        providerAccountId: account.providerAccountId 
      });
      throw new Error("invalid signin account - missing required fields");
    }

    const userInfo: UserType = {
      uuid: getUuid(),
      email: user.email,
      nickname: user.name || "",
      avatar_url: user.image || "",
      signin_type: account.type,
      signin_provider: account.provider,
      signin_openid: account.providerAccountId,
      created_at: new Date(),
      signin_ip: await getClientIp(),
    };

    console.log("handleSignInUser: user info prepared", { 
      uuid: userInfo.uuid,
      email: userInfo.email,
      provider: userInfo.signin_provider 
    });

    const savedUser = await saveUser(userInfo);

    console.log("handleSignInUser: user saved successfully", { uuid: savedUser.uuid });
    return savedUser;
  } catch (e) {
    console.error("handleSignInUser: failed with error:", e);
    console.error("handleSignInUser: error details", {
      userEmail: user?.email,
      provider: account?.provider,
      errorMessage: e instanceof Error ? e.message : 'Unknown error',
      errorStack: e instanceof Error ? e.stack : 'No stack trace'
    });
    throw e;
  }
}
