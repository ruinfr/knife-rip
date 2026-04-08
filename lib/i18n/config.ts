export const LOCALE_COOKIE = "KNIFE_LOCALE";

export const locales = ["en", "de", "ja", "ko"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeLabels: Record<
  Locale,
  {
    /** Unicode regional flag / flag emoji for compact UI */
    flag: string;
    /** Primary label (often native name) */
    label: string;
    /** Region in English, parentheses in UI */
    region: string;
    /** BCP 47 for <html lang> */
    htmlLang: string;
  }
> = {
  en: { flag: "🇺🇸", label: "English", region: "US", htmlLang: "en" },
  de: { flag: "🇩🇪", label: "Deutsch", region: "Deutschland", htmlLang: "de" },
  ja: { flag: "🇯🇵", label: "日本語", region: "Japan", htmlLang: "ja" },
  ko: { flag: "🇰🇷", label: "한국어", region: "Korea", htmlLang: "ko" },
};

export function isLocale(v: string): v is Locale {
  return (locales as readonly string[]).includes(v);
}
