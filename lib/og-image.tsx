/**
 * JSX for `next/og` ImageResponse — inline styles only (subset supported by Satori).
 */
export function OgImageMarkup() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#050a12",
        padding: 72,
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -60,
          width: 520,
          height: 520,
          background:
            "radial-gradient(circle at 60% 40%, rgba(37, 99, 235, 0.22), transparent 58%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -40,
          left: -80,
          width: 440,
          height: 440,
          background:
            "radial-gradient(circle at 40% 60%, rgba(30, 58, 138, 0.35), transparent 55%)",
        }}
      />
      <div
        style={{
          fontSize: 108,
          fontWeight: 800,
          color: "#eef2ff",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        Arivix
      </div>
      <div
        style={{
          fontSize: 34,
          color: "#8f96a8",
          marginTop: 16,
          fontWeight: 500,
        }}
      >
        arivix.org
      </div>
      <div
        style={{
          width: 100,
          height: 4,
          background:
            "linear-gradient(90deg, #60a5fa, rgba(96, 165, 250, 0.2))",
          marginTop: 40,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          fontSize: 28,
          color: "#b8c0d4",
          marginTop: 36,
          maxWidth: 820,
          lineHeight: 1.45,
          fontWeight: 400,
        }}
      >
        All-in-one Discord bot — moderation, utilities, engagement.
      </div>
    </div>
  );
}
