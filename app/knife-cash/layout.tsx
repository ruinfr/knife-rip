import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function KnifeCashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin/discord?callbackUrl=/knife-cash");
  }

  return <div className="flex flex-1 flex-col">{children}</div>;
}
