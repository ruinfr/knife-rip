import type { Metadata } from "next";
import { Geist_Mono, Outfit, Syne } from "next/font/google";
import { Analytics } from "@/components/analytics";
import { IconifyRegister } from "@/components/iconify-register";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "@/components/providers";
import { siteMetadataBase } from "@/lib/site-url";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const metadataBase = siteMetadataBase();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "Knife",
    template: "%s · Knife",
  },
  description:
    "Knife — Discord bot for moderation, utilities, and community tools. Prefix commands, dashboard, and optional lifetime Pro.",
  openGraph: {
    title: "Knife",
    description:
      "Discord bot for moderation, utilities, and community tools — knife.rip",
    url: metadataBase,
    siteName: "Knife",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Knife — knife.rip",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knife",
    description:
      "Discord bot for moderation, utilities, and community tools — knife.rip",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="site-canvas flex min-h-full flex-col font-sans">
        <a href="#site-main" className="skip-to-main">
          Skip to main content
        </a>
        <Analytics />
        <Providers>
          <IconifyRegister />
          <SiteHeader />
          <div
            id="site-main"
            className="relative z-[1] flex flex-1 flex-col"
            tabIndex={-1}
          >
            {children}
          </div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
