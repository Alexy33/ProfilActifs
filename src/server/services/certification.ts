import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  certificationAnswer,
  certificationAttempt,
  profile,
  question,
  questionOption,
} from "@/db/schema";
import { getSettings } from "./settings";

/**
 * Questionnaire de certification (CDC 2.2).
 *
 * Le bareme n'est pas uniforme : chaque question porte une ponderation (1-5) et
 * chaque reponse une valeur en points. Le score sur 100 est donc le rapport
 * entre les points obtenus et le maximum atteignable, et non une moyenne de
 * bonnes reponses.
 */

export interface LoadedQuestion {
  id: string;
  text: string;
  weight: number;
  position: number;
  options: { id: string; label: string; value: number }[];
}

export async function loadQuestions(): Promise<LoadedQuestion[]> {
  const questions = await db.select().from(question).orderBy(asc(question.position));
  const options = await db.select().from(questionOption).orderBy(asc(questionOption.position));

  const byQuestion = new Map<string, typeof options>();
  for (const option of options) {
    const list = byQuestion.get(option.questionId) ?? [];
    list.push(option);
    byQuestion.set(option.questionId, list);
  }

  return questions.map((row) => ({
    id: row.id,
    text: row.text,
    weight: row.weight,
    position: row.position,
    options: (byQuestion.get(row.id) ?? []).map((option) => ({
      id: option.id,
      label: option.label,
      value: option.value,
    })),
  }));
}

/** Tentative courante : celle en cours, sinon la derniere soumise. */
export async function currentAttempt(userId: string) {
  const [inProgress] = await db
    .select()
    .from(certificationAttempt)
    .where(
      and(eq(certificationAttempt.userId, userId), eq(certificationAttempt.status, "in_progress")),
    )
    .limit(1);
  if (inProgress) return inProgress;

  const [last] = await db
    .select()
    .from(certificationAttempt)
    .where(eq(certificationAttempt.userId, userId))
    .orderBy(desc(certificationAttempt.createdAt))
    .limit(1);
  return last ?? null;
}

/** Tentative en cours, creee a la volee si le candidat commence maintenant. */
export async function openAttempt(userId: string) {
  const existing = await currentAttempt(userId);
  if (existing && existing.status === "in_progress") return existing;

  const [created] = await db
    .insert(certificationAttempt)
    .values({ id: crypto.randomUUID(), userId, status: "in_progress" })
    .returning();
  return created;
}

export async function answersOf(attemptId: string): Promise<Record<string, number>> {
  const rows = await db
    .select()
    .from(certificationAnswer)
    .where(eq(certificationAnswer.attemptId, attemptId));
  return Object.fromEntries(rows.map((row) => [row.questionId, row.value]));
}

export interface CertificationState {
  status: "not_started" | "in_progress" | "submitted";
  answers: Record<string, number>;
  answered: number;
  questionCount: number;
  threshold: number;
  score: number | null;
  passed: boolean | null;
  submittedAt: string | null;
}

export async function certificationState(userId: string): Promise<CertificationState> {
  const [attempt, questions, settings] = await Promise.all([
    currentAttempt(userId),
    loadQuestions(),
    getSettings(),
  ]);

  const answers = attempt ? await answersOf(attempt.id) : {};

  return {
    status: attempt ? attempt.status : "not_started",
    answers,
    answered: Object.keys(answers).length,
    questionCount: questions.length,
    threshold: settings.certificationThreshold,
    score: attempt?.score ?? null,
    passed: attempt?.passed ?? null,
    submittedAt: attempt?.submittedAt?.toISOString() ?? null,
  };
}

/**
 * Score sur 100 : points obtenus / points atteignables.
 *
 * Une question sans reponse compte zero point mais reste dans le maximum :
 * abandonner en cours de route ne peut pas gonfler le score.
 */
export function computeScore(
  questions: LoadedQuestion[],
  answers: Record<string, number>,
): number {
  let obtained = 0;
  let maximum = 0;

  for (const item of questions) {
    const best = Math.max(0, ...item.options.map((option) => option.value));
    maximum += item.weight * best;

    const given = answers[item.id];
    if (typeof given === "number") obtained += item.weight * given;
  }

  if (maximum === 0) return 0;
  return Math.round((obtained / maximum) * 100);
}

export interface SubmitResult {
  score: number;
  threshold: number;
  passed: boolean;
  certified: boolean;
}

/**
 * Cloture la tentative et met le profil a jour.
 *
 * Echouer ne retire PAS une certification deja obtenue : le badge reste acquis
 * tant que le candidat ne l'a pas repasse avec succes ou qu'il n'expire pas.
 */
export async function submitAttempt(userId: string): Promise<SubmitResult> {
  const attempt = await openAttempt(userId);
  const [questions, settings, answers] = await Promise.all([
    loadQuestions(),
    getSettings(),
    answersOf(attempt.id),
  ]);

  const score = computeScore(questions, answers);
  const passed = score >= settings.certificationThreshold;
  const now = new Date();

  await db
    .update(certificationAttempt)
    .set({ status: "submitted", score, passed, submittedAt: now })
    .where(eq(certificationAttempt.id, attempt.id));

  const [owned] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);

  if (owned && passed) {
    await db
      .update(profile)
      .set({ score, certifiedAt: now, updatedAt: now })
      .where(eq(profile.id, owned.id));
  }

  return {
    score,
    threshold: settings.certificationThreshold,
    passed,
    certified: passed || (owned?.certifiedAt ?? null) !== null,
  };
}
