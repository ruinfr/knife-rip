import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Manage",
  description: "Redirect to your Arivix dashboard for billing and servers.",
  robots: { index: false, follow: false },
};

/**
 * Short “magic path” the bot can share (no secrets). Always lands on the dashboard.
 */
export default function ManagePage() {
  redirect("/dashboard");
}
