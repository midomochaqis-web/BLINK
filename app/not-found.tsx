import Link from "next/link";

export default function NotFound() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f7fa", color: "#111116", padding: 24, fontFamily: "system-ui, sans-serif" }}>
    <section style={{ maxWidth: 440, textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", margin: "0 auto 22px", background: "#5145e5", color: "white", fontSize: 25, fontWeight: 800 }}>B</div>
      <p style={{ color: "#5145e5", fontWeight: 800, letterSpacing: 2, fontSize: 11 }}>404 · NOT FOUND</p>
      <h1 style={{ fontSize: 36, letterSpacing: -1.5, margin: "12px 0" }}>This page went off-script.</h1>
      <p style={{ color: "#777785", lineHeight: 1.7 }}>The page you are looking for does not exist or may have moved.</p>
      <Link href="/" style={{ display: "inline-flex", marginTop: 12, borderRadius: 9, padding: "12px 16px", background: "#5145e5", color: "white", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>Back to BLINK →</Link>
    </section>
  </main>;
}
