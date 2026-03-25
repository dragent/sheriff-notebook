import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const metadataBase = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const logoSrc = new URL("/logo.png", metadataBase).toString();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(1100px 600px at 14% 55%, rgba(197, 199, 204, 0.14), rgba(0, 0, 0, 0) 56%), radial-gradient(900px 520px at 72% 40%, rgba(30, 36, 46, 0.55), rgba(0, 0, 0, 0) 62%), linear-gradient(135deg, #0f1012 0%, #13151c 55%, #0f1012 100%)",
          color: "#e6e7ea",
          fontFamily:
            'ui-serif, "Georgia", "Times New Roman", Times, serif',
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 64,
              letterSpacing: -0.8,
              lineHeight: 1.05,
              fontWeight: 700,
              textTransform: "none",
            }}
          >
            Bureau du Shérif — Annesburg
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.25,
              maxWidth: 700,
              color: "rgba(230, 231, 234, 0.86)",
            }}
          >
            Registre officiel du bureau du shérif d&apos;Annesburg. Dossiers,
            enquêtes
            et communication intercomté.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 22,
              color: "rgba(197, 199, 204, 0.95)",
            }}
          >
            <span style={{ fontWeight: 600 }}>sheriff.annesburg</span>
            <span style={{ color: "rgba(230, 231, 234, 0.35)" }}>•</span>
            <span style={{ color: "rgba(230, 231, 234, 0.72)" }}>
              Dossiers & enquêtes
            </span>
          </div>
        </div>

        <div
          style={{
            width: 380,
            height: 380,
            borderRadius: 28,
            background:
              "linear-gradient(180deg, rgba(30, 36, 46, 0.92), rgba(19, 21, 28, 0.86))",
            border: "1px solid rgba(197, 199, 204, 0.38)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 22px 60px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.35)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={logoSrc}
            width={330}
            height={330}
            style={{
              objectFit: "contain",
              filter:
                "drop-shadow(0 22px 22px rgba(0,0,0,0.55)) drop-shadow(0 0 1px rgba(0,0,0,0.35))",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}

