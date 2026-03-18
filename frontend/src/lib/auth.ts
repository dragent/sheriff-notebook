/** NextAuth config: Discord provider, callbacks, pages. Aligned with backend (shared JWT). */

import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import type { DiscordProfile } from "next-auth/providers/discord";
import { getEnv, trimEnv, isDev } from "@/lib/env";
import { ROUTES } from "@/lib/routes";

const discordClientId = getEnv("DISCORD_CLIENT_ID");
const discordClientSecret = getEnv("DISCORD_CLIENT_SECRET");
const nextAuthSecret = trimEnv(process.env.NEXTAUTH_SECRET);

function isDiscordProfile(profile: unknown): profile is DiscordProfile {
  return (
    profile !== null &&
    typeof profile === "object" &&
    "username" in profile &&
    typeof (profile as DiscordProfile).username === "string"
  );
}

/** Durée de vie de la session (en secondes). Défaut NextAuth : 30 jours. */
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours
/** Intervalle de rafraîchissement de la session (en secondes). Si dépassé, la session est mise à jour. Défaut NextAuth : 24 h. */
const SESSION_UPDATE_AGE = 24 * 60 * 60; // 24 h

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret || undefined,
  debug: isDev,
  ...({ trustHost: true } as Partial<NextAuthOptions>),
  session: {
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  pages: {
    signIn: ROUTES.HOME,
  },
  providers: [
    DiscordProvider({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      authorization: {
        params: {
          scope: "identify guilds.join",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }) {
      if (isDiscordProfile(profile)) {
        token.name = profile.username;
      }
      if (account?.access_token) {
        token.discordAccessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.discordId = token.sub ?? null;
      }
      session.discordAccessToken = token.discordAccessToken as string | undefined;
      return session;
    },
  },
};
