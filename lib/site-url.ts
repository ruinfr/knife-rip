/** Canonical site origin for metadata, redirects, and OAuth (no trailing slash). */
export function siteMetadataBase(): URL {
  const explicit =
    process.env.AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit);
    } catch {
      /* fall through */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`);
    } catch {
      /* fall through */
    }
  }
  return new URL("https://knife.rip");
}
