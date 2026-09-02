import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth-session";

// for route protection inheritance

export default async function RecruiterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "recruiter") {
    redirect("/");
  }

  return children;
}
