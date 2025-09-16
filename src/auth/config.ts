import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { NextAuthConfig } from "next-auth";
import { Provider } from "next-auth/providers/index";
import { User } from "@/types/user";
import { getClientIp } from "@/lib/ip";
import { getIsoTimestr } from "@/lib/time";
import { getUuid } from "@/lib/hash";
import { saveUser } from "@/services/user";
import { handleSignInUser } from "./handler";

// Add proxy support for fetch requests
const originalFetch = global.fetch;
let proxyAgent: any = null;

if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  console.log("Setting up proxy for OAuth requests");
  try {
    // For Google OAuth requests, we need to use proxy
    const { HttpsProxyAgent } = require('https-proxy-agent');
    proxyAgent = new HttpsProxyAgent(process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
    console.log("Proxy agent configured:", process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
  } catch (error) {
    console.warn("Failed to setup proxy agent:", error.message);
  }
}

let providers: Provider[] = [];

console.log("GOOGLE_ID", process.env.AUTH_GOOGLE_ID, "GOOGLE_SECRET", process.env.AUTH_GOOGLE_SECRET, "NEXT_PUBLIC_AUTH_GOOGLE_ENABLED", process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED);

console.log("NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED", process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED, "NEXT_PUBLIC_AUTH_GOOGLE_ID", process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID);

// Google One Tap Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ONE_TAP_ENABLED === "true" &&
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID
) {
  providers.push(
    CredentialsProvider({
      id: "google-one-tap",
      name: "google-one-tap",

      credentials: {
        credential: { type: "text" },
      },

      async authorize(credentials, req) {
        const googleClientId = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID;
        if (!googleClientId) {
          console.log("invalid google auth config");
          return null;
        }

        const token = credentials!.credential;

        console.log("Verifying Google One Tap token with proxy:", !!proxyAgent);

        const fetchOptions: RequestInit = {
          method: 'GET',
        };

        // Add proxy agent if available
        if (proxyAgent) {
          (fetchOptions as any).agent = proxyAgent;
        }

        const response = await fetch(
          "https://oauth2.googleapis.com/tokeninfo?id_token=" + token,
          fetchOptions
        );

        console.log("Token verification response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.log("Failed to verify token. Status:", response.status, "Error:", errorText);
          return null;
        }

        const payload = await response.json();
        if (!payload) {
          console.log("invalid payload from token");
          return null;
        }

        const {
          email,
          sub,
          given_name,
          family_name,
          email_verified,
          picture: image,
        } = payload;
        if (!email) {
          console.log("invalid email in payload");
          return null;
        }

        const user = {
          id: sub,
          name: [given_name, family_name].join(" "),
          email,
          image,
          emailVerified: email_verified ? new Date() : null,
        };

        return user;
      },
    })
  );
}

// Google Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" &&
  process.env.AUTH_GOOGLE_ID &&
  process.env.AUTH_GOOGLE_SECRET
) {
  console.log("Configuring Google Provider with:", {
    clientId: process.env.AUTH_GOOGLE_ID,
    secretLength: process.env.AUTH_GOOGLE_SECRET.length
  });

  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: "openid email profile"
        }
      }
    })
  );
}

// Github Auth
if (
  process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true" &&
  process.env.AUTH_GITHUB_ID &&
  process.env.AUTH_GITHUB_SECRET
) {
  providers.push(
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    })
  );
}

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider();
      return { id: providerData.id, name: providerData.name };
    } else {
      return { id: provider.id, name: provider.name };
    }
  })
  .filter((provider) => provider.id !== "google-one-tap");

export const authOptions: NextAuthConfig = {
  providers,
  pages: {
    signIn: "/auth/signin",
  },
  debug: true,
  logger: {
    error(error) {
      console.error("[NextAuth Error]", error);
    },
    warn(code) {
      console.warn("[NextAuth Warn]", code);
    },
    debug(code, metadata) {
      console.log("[NextAuth Debug]", code, metadata);
    }
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log("[SignIn Callback] Provider:", account?.provider);
      console.log("[SignIn Callback] Account:", account);
      console.log("[SignIn Callback] User:", user);

      const isAllowedToSignIn = true;
      if (isAllowedToSignIn) {
        return true;
      } else {
        // Return false to display a default error message
        return false;
        // Or you can return a URL to redirect to:
        // return '/unauthorized'
      }
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token, user }) {
      if (token && token.user && token.user) {
        session.user = token.user;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      try {
        if (!user || !account) {
          return token;
        }

        const userInfo = await handleSignInUser(user, account);
        if (!userInfo) {
          throw new Error("save user failed");
        }

        token.user = {
          uuid: userInfo.uuid,
          email: userInfo.email,
          nickname: userInfo.nickname,
          avatar_url: userInfo.avatar_url,
          created_at: userInfo.created_at,
        };

        return token;
      } catch (e) {
        console.error("jwt callback error:", e);
        return token;
      }
    },
  },
};
