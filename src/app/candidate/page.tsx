import { notFound } from "next/navigation";

import { CandidateDashboard } from "@/components/candidate/candidate-dashboard";
import { SiteShell } from "@/components/layout/site-shell";
import { getCurrentSession } from "@/lib/auth-session";
import { CITIES, SECTORS, SKILLS } from "@/lib/vocabulary";
import { findProfileByUserId } from "@/server/services/profiles";

export const dynamic = "force-dynamic";

export default async function CandidatePage() {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  const profile = await findProfileByUserId(session.user.id);
  if (!profile) notFound();

  return (
    <SiteShell>
      <CandidateDashboard initialProfile={profile} sectors={SECTORS} cities={CITIES} skills={SKILLS} />
    </SiteShell>
  );
}
