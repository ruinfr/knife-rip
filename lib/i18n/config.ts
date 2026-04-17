export const LOCALE_COOKIE = "ARIVIX_LOCALE";

export const locales = ["en", "de", "ja", "ko"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<
  Locale,
  {
    /** Iconify icon id (`circle-flags:*`) */
    flagIcon: string;
    /** Primary label (often native name) */
    label: string;
    /** Region in English, parentheses in UI */
    region: string;
    /** BCP 47 for <html lang> */
    htmlLang: string;
  }
> = {
  en: { flagIcon: "circle-flags:us", label: "English", region: "US", htmlLang: "en" },
  de: {
    flagIcon: "circle-flags:de",
    label: "Deutsch",
    region: "Deutschland",
    htmlLang: "de",
  },
  ja: { flagIcon: "circle-flags:jp", label: "日本語", region: "Japan", htmlLang: "ja" },
  ko: { flagIcon: "circle-flags:kr", label: "한국어", region: "Korea", htmlLang: "ko" },
};

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}
