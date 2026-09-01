import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth-session";

// for route protection inheritance

export default async function CandidateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "candidate") {
    redirect("/");
  }

  return children;
}
