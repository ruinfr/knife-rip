import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ArivixCashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin/discord?callbackUrl=/arivix-cash");
  }

  return <div className="flex flex-1 flex-col">{children}</div>;
}
