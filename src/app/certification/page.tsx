import { requireRole } from "@/lib/session";
import { certificationState, loadQuestions } from "@/server/services/certification";
import { Quiz } from "@/components/certification/quiz";

export const dynamic = "force-dynamic";

/**
 * Questionnaire de certification du demandeur.
 *
 * Les questions sont projetees ici dans la meme forme que
 * `GET /api/certification/questions` : identifiant, libelle, et les options
 * SANS leur bareme. La ponderation ne quitte jamais le serveur.
 */
export default async function CertificationPage() {
  const session = await requireRole("candidate");

  const [questions, state] = await Promise.all([
    loadQuestions(),
    certificationState(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-[780px]">
      <Quiz
        questions={questions.map((question) => ({
          id: question.id,
          text: question.text,
          options: question.options.map((option) => ({ id: option.id, label: option.label })),
        }))}
        initialAnswers={state.answers}
        initialResult={
          state.status === "submitted" && state.score !== null
            ? { score: state.score, threshold: state.threshold, passed: state.passed ?? false }
            : null
        }
        threshold={state.threshold}
      />
    </div>
  );
}
