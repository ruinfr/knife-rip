import { OgImageMarkup } from "@/lib/og-image";
import { ImageResponse } from "next/og";

export const alt = "Arivix — arivix.org";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(<OgImageMarkup />, {
    ...size,
  });
}
