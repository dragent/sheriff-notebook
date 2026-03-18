import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      image?: string | null;
      discordId?: string | null;
    };
    /** Token OAuth Discord (scope guilds.join), présent au premier chargement après connexion pour ajouter l'utilisateur au serveur. */
    discordAccessToken?: string;
  }
}

