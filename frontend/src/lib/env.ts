export function trimEnv(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
  return raw;
}

export function getEnv(name: string): string {
  return trimEnv(process.env[name] ?? "");
}

export const isDev = process.env.NODE_ENV === "development";
