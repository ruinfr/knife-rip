import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

function ShieldGlyph({ s }: { s: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="ash" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ash)"
        d="M12 2 4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3Z"
      />
    </svg>
  );
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0e14",
          borderRadius: 36,
        }}
      >
        <ShieldGlyph s={124} />
      </div>
    ),
    { ...size },
  );
}
