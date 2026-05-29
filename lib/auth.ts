import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import type { DefaultSession } from "next-auth";
import { authenticateUser } from "@/lib/user-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id?: string;
    } & DefaultSession["user"];
  }
}

type AuthToken = {
  sub?: string;
  email?: string;
  accessToken?: string;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: (() => {
    const providers: NextAuthConfig["providers"] = [
      Credentials({
        name: "Email and Password",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const email = credentials?.email;
          const password = credentials?.password;

          if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
            return null;
          }

          const userId = await authenticateUser(email, password);

          if (!userId) {
            return null;
          }

          return {
            id: userId,
          };
        },
      }),
    ];

    const githubClientId = process.env.GITHUB_CLIENT_ID ?? process.env.CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET ?? process.env.CLIENT_SECRET;

    if (githubClientId && githubClientSecret) {
      providers.push(
        GitHub({
          clientId: githubClientId,
          clientSecret: githubClientSecret,
        })
      );
    }

    return providers;
  })(),
  callbacks: {
    async jwt({ token, account, user, profile }) {
      const authToken = token as typeof token & AuthToken;

      if (user?.email) {
        authToken.email = user.email;
      }

      if (profile && typeof profile === "object" && "email" in profile) {
        const profileEmail = (profile as { email?: string | null }).email;
        if (typeof profileEmail === "string" && profileEmail) {
          authToken.email = profileEmail;
        }
      }

      if (account?.provider === "github" && account.access_token) {
        authToken.accessToken = account.access_token;
      }

      return authToken;
    },
    async session({ session, token }) {
      const authToken = token as typeof token & AuthToken;

      session.accessToken = authToken.accessToken;
      session.user = {
        ...session.user,
        ...(authToken.sub ? { id: authToken.sub } : {}),
        ...(authToken.email ? { email: authToken.email } : {}),
      } as typeof session.user;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
