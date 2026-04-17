import type { Metadata } from "next";
import { ArivixCashClient } from "./arivix-cash-client";

export const metadata: Metadata = {
  title: "Arivix Cash",
  description:
    "Arivix Cash on the web — same global wallet and leaderboards as Discord. Also reachable at /gamble, /cash, and /economy.",
  alternates: {
    canonical: "/arivix-cash",
  },
};

export default function ArivixCashPage() {
  return <ArivixCashClient />;
}
