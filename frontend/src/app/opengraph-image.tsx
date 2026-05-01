import { ImageResponse } from "next/og";

// Self-hosted (Docker/VPS) setups may block/slow external fetches (e.g. Google Fonts),
// which can make OG image generation time out and Discord won't show the banner.
// Node runtime is typically more reliable for self-hosting than edge.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOOGLE_FONT_CSS =
  "https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Source+Sans+3:wght@400;600&family=Special+Elite&display=swap";

type OgFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: OgFontWeight;
  style: "normal";
};

async function loadGoogleFontsForOg(): Promise<OgFont[]> {
  try {
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const css = await fetch(GOOGLE_FONT_CSS, {
      headers: { "User-Agent": userAgent },
      signal: controller.signal,
      cache: "no-store",
    }).then((r) => r.text());
    clearTimeout(timeout);

    const fonts: OgFont[] = [];
    const seen = new Set<string>();
    const faceBlocks = css.matchAll(/@font-face\s*\{([^}]+)\}/g);

    for (const [, block] of faceBlocks) {
      const family = /font-family:\s*['"]([^'"]+)['"]/.exec(block)?.[1];
      const weightStr = /font-weight:\s*(\d+)/.exec(block)?.[1];
      const urlMatch =
        /url\(([^)]+)\)\s*format\s*\(\s*['"]woff2['"]\s*\)/.exec(block);
      if (!family || !weightStr || !urlMatch) {
        continue;
      }
      const weight = Number.parseInt(weightStr, 10);
      const key = `${family}:${weight}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const fontUrl = urlMatch[1].replace(/&amp;/g, "&");
      const fontController = new AbortController();
      const fontTimeout = setTimeout(() => fontController.abort(), 2500);
      const data = await fetch(fontUrl, {
        signal: fontController.signal,
        cache: "force-cache",
      }).then((r) => r.arrayBuffer());
      clearTimeout(fontTimeout);
      fonts.push({
        name: family,
        data,
        weight: weight as OgFontWeight,
        style: "normal",
      });
    }

    return fonts;
  } catch {
    return [];
  }
}

export default async function OpengraphImage() {
  const metadataBase = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const logoSrc = new URL("/logo.png", metadataBase).toString();
  const fonts = await loadGoogleFontsForOg();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "64px 68px",
          background: `
            radial-gradient(980px 540px at 16% 42%, rgba(72, 58, 44, 0.38), rgba(0, 0, 0, 0) 58%),
            radial-gradient(840px 500px at 92% 30%, rgba(48, 40, 34, 0.32), rgba(0, 0, 0, 0) 52%),
            radial-gradient(800px 420px at 48% 108%, rgba(82, 64, 42, 0.12), rgba(0, 0, 0, 0) 48%),
            linear-gradient(148deg, #0f0c09 0%, #1a1510 40%, #15120e 68%, #0a0806 100%)
          `,
          color: "#ebe8e2",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 44,
            width: "100%",
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              flex: 1,
              minWidth: 0,
              maxWidth: 640,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  fontFamily: '"Special Elite", "Courier New", monospace',
                  fontSize: 22,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  color: "rgba(184, 153, 104, 0.85)",
                }}
              >
                Registre officiel · Est. 1899
              </div>
              <div
                style={{
                  fontFamily: '"IM Fell English SC", serif',
                  fontSize: 60,
                  fontWeight: 400,
                  letterSpacing: 1.5,
                  lineHeight: 1.08,
                  color: "#f7f4ee",
                }}
              >
                Bureau du Shérif
              </div>
              <div
                style={{
                  fontFamily: '"IM Fell English SC", serif',
                  fontSize: 50,
                  fontWeight: 400,
                  letterSpacing: 2.4,
                  lineHeight: 1.05,
                  color: "rgba(235, 224, 200, 0.92)",
                }}
              >
                Annesburg
              </div>
            </div>

            <div
              style={{
                fontFamily: '"Source Sans 3", system-ui, sans-serif',
                fontSize: 29,
                fontWeight: 400,
                lineHeight: 1.28,
                maxWidth: 600,
                color: "rgba(232, 226, 216, 0.88)",
              }}
            >
              Registre officiel du bureau du shérif d&apos;Annesburg. Dossiers,
              enquêtes et communication intercomté.
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: '"Source Sans 3", system-ui, sans-serif',
                fontSize: 26,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "rgba(244, 236, 220, 0.95)",
                }}
              >
                sheriff.annesburg
              </span>
              <span style={{ color: "rgba(184, 154, 104, 0.75)" }}>·</span>
              <span
                style={{
                  fontWeight: 400,
                  color: "rgba(215, 206, 190, 0.88)",
                }}
              >
                {"Dossiers & enquêtes"}
              </span>
            </div>
          </div>

          <div
            style={{
              width: 1,
              height: 300,
              flexShrink: 0,
              background:
                "linear-gradient(180deg, rgba(184, 154, 104, 0), rgba(184, 154, 104, 0.5) 22%, rgba(184, 154, 104, 0.55) 78%, rgba(184, 154, 104, 0))",
            }}
          />

          <div
            style={{
              width: 372,
              height: 372,
              flexShrink: 0,
              borderRadius: 18,
              background:
                "linear-gradient(180deg, rgba(34, 28, 22, 0.92), rgba(14, 11, 9, 0.9))",
              border: "1px solid rgba(160, 132, 88, 0.26)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 26,
              boxShadow:
                "0 16px 42px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255, 248, 230, 0.05)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              src={logoSrc}
              width={292}
              height={292}
              style={{
                objectFit: "contain",
                filter:
                  "drop-shadow(0 16px 20px rgba(0,0,0,0.5)) drop-shadow(0 0 1px rgba(0,0,0,0.45))",
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
