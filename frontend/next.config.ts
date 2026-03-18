import type { NextConfig } from "next";
import path from "path";
import fs from "fs";
import { withSentryConfig } from "@sentry/nextjs";

// Charge .env.local depuis le dossier frontend (même si on lance depuis la racine)
const envPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  webpack: (config) => {
    // Sentry/OpenTelemetry utilise des require() dynamiques — avertissement sans impact fonctionnel.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@opentelemetry\/instrumentation/ },
    ];
    return config;
  },
  async redirects() {
    return [{ source: "/signin", destination: "/", permanent: false }];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/avatars/**",
      },
    ],
  },
  // Expose les variables Discord pour NextAuth
  env: {
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ?? "",
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ?? "",
  },
};

const sentryOptions = {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
};

export default process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryOptions)
  : nextConfig;
