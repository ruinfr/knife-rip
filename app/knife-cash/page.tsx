import type { Metadata } from "next";
import { KnifeCashClient } from "./knife-cash-client";

export const metadata: Metadata = {
  title: "Arivix Cash",
  description:
    "Arivix Cash on the web — same global wallet and leaderboards as Discord. Also reachable at /gamble, /cash, and /economy.",
  alternates: {
    canonical: "/knife-cash",
  },
};

export default function KnifeCashPage() {
  return <KnifeCashClient />;
}
