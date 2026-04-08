import type { Locale } from "@/lib/i18n/config";

export type SiteMessages = {
  header: {
    navDocs: string;
    navNews: string;
    navCommands: string;
    navEmbed: string;
    navPricing: string;
    navStatus: string;
    signingIn: string;
    dashboard: string;
    signOut: string;
    signIn: string;
    signInDiscord: string;
    menuOpen: string;
    menuClose: string;
    mainNavAria: string;
    mobileNavAria: string;
    languageAria: string;
    selectLanguage: string;
    skipToMain: string;
  };
  footer: {
    tagline: string;
    product: string;
    legal: string;
    connect: string;
    home: string;
    docs: string;
    commands: string;
    pricing: string;
    dashboard: string;
    terms: string;
    privacy: string;
    status: string;
    support: string;
  };
};

const en: SiteMessages = {
  header: {
    navDocs: "Docs",
    navNews: "News",
    navCommands: "Commands",
    navEmbed: "Embed",
    navPricing: "Pricing",
    navStatus: "Status",
    signingIn: "Signing in…",
    dashboard: "Dashboard",
    signOut: "Sign out",
    signIn: "Sign in",
    signInDiscord: "Sign in with Discord",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    mainNavAria: "Main",
    mobileNavAria: "Mobile",
    languageAria: "Language",
    selectLanguage: "Select language",
    skipToMain: "Skip to main content",
  },
  footer: {
    tagline:
      "Moderation, utilities, and engagement — prefix commands today at knife.rip.",
    product: "Product",
    legal: "Legal",
    connect: "Connect",
    home: "Home",
    docs: "Docs",
    commands: "Commands",
    pricing: "Pricing",
    dashboard: "Dashboard",
    terms: "Terms",
    privacy: "Privacy",
    status: "Status",
    support: "Support",
  },
};

const de: SiteMessages = {
  header: {
    navDocs: "Dokumentation",
    navNews: "Neuigkeiten",
    navCommands: "Befehle",
    navEmbed: "Embed",
    navPricing: "Preise",
    navStatus: "Status",
    signingIn: "Anmeldung…",
    dashboard: "Dashboard",
    signOut: "Abmelden",
    signIn: "Anmelden",
    signInDiscord: "Mit Discord anmelden",
    menuOpen: "Menü öffnen",
    menuClose: "Menü schließen",
    mainNavAria: "Hauptnavigation",
    mobileNavAria: "Mobil",
    languageAria: "Sprache",
    selectLanguage: "Sprache wählen",
    skipToMain: "Zum Hauptinhalt springen",
  },
  footer: {
    tagline:
      "Moderation, Hilfen und Engagement — Prefix-Befehle auf knife.rip.",
    product: "Produkt",
    legal: "Rechtliches",
    connect: "Kontakt",
    home: "Start",
    docs: "Dokumentation",
    commands: "Befehle",
    pricing: "Preise",
    dashboard: "Dashboard",
    terms: "Nutzungsbedingungen",
    privacy: "Datenschutz",
    status: "Status",
    support: "Support",
  },
};

const ja: SiteMessages = {
  header: {
    navDocs: "ドキュメント",
    navNews: "ニュース",
    navCommands: "コマンド",
    navEmbed: "埋め込み",
    navPricing: "料金",
    navStatus: "ステータス",
    signingIn: "サインイン中…",
    dashboard: "ダッシュボード",
    signOut: "ログアウト",
    signIn: "ログイン",
    signInDiscord: "Discord でログイン",
    menuOpen: "メニューを開く",
    menuClose: "メニューを閉じる",
    mainNavAria: "メイン",
    mobileNavAria: "モバイル",
    languageAria: "言語",
    selectLanguage: "言語を選択",
    skipToMain: "メインコンテンツへスキップ",
  },
  footer: {
    tagline:
      "モデレーション、ユーティリティ、エンゲージメント — knife.rip のプレフィックスコマンド。",
    product: "プロダクト",
    legal: "法的情報",
    connect: "リンク",
    home: "ホーム",
    docs: "ドキュメント",
    commands: "コマンド",
    pricing: "料金",
    dashboard: "ダッシュボード",
    terms: "利用規約",
    privacy: "プライバシー",
    status: "ステータス",
    support: "サポート",
  },
};

const ko: SiteMessages = {
  header: {
    navDocs: "문서",
    navNews: "소식",
    navCommands: "명령어",
    navEmbed: "임베드",
    navPricing: "요금",
    navStatus: "상태",
    signingIn: "로그인 중…",
    dashboard: "대시보드",
    signOut: "로그아웃",
    signIn: "로그인",
    signInDiscord: "Discord로 로그인",
    menuOpen: "메뉴 열기",
    menuClose: "메뉴 닫기",
    mainNavAria: "메인",
    mobileNavAria: "모바일",
    languageAria: "언어",
    selectLanguage: "언어 선택",
    skipToMain: "본문으로 건너뛰기",
  },
  footer: {
    tagline:
      "운영, 유틸리티, 참여 — knife.rip의 접두사 명령어.",
    product: "제품",
    legal: "법적 고지",
    connect: "연결",
    home: "홈",
    docs: "문서",
    commands: "명령어",
    pricing: "요금",
    dashboard: "대시보드",
    terms: "이용약관",
    privacy: "개인정보",
    status: "상태",
    support: "지원",
  },
};

const byLocale: Record<Locale, SiteMessages> = {
  en,
  de,
  ja,
  ko,
};

export function getMessages(locale: Locale): SiteMessages {
  return byLocale[locale] ?? en;
}
