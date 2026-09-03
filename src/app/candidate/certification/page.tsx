import { CertificationQuestionnaire } from "@/components/candidate/certification-questionnaire";
import { SiteShell } from "@/components/layout/site-shell";
import { getCurrentSession } from "@/lib/auth-session";
import { certificationState, loadQuestions } from "@/server/services/certification";

export const dynamic = "force-dynamic";

export default async function CertificationPage() {
  const session = await getCurrentSession();
  if (!session?.user) return null;

  const [questions, state] = await Promise.all([
    loadQuestions(),
    certificationState(session.user.id),
  ]);

  return (
    <SiteShell>
      <CertificationQuestionnaire
        initialQuestions={questions.map((question) => ({
          id: question.id,
          text: question.text,
          position: question.position,
          options: question.options.map((option) => ({ id: option.id, label: option.label })),
        }))}
        initialState={state}
      />
    </SiteShell>
  );
}
