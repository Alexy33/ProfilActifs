"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { RadioOption } from "@/components/ui/radio-option";
import { useToast } from "@/components/ui/toast";

export interface QuizQuestion {
  id: string;
  text: string;
  options: { id: string; label: string }[];
}

export interface QuizResult {
  score: number;
  threshold: number;
  passed: boolean;
}

/**
 * Questionnaire de certification.
 *
 * Une question a la fois, et CHAQUE reponse est envoyee des qu'elle est
 * choisie : quitter en cours de route ne perd rien, la reprise est le
 * comportement par defaut et non une fonctionnalite a part.
 *
 * La reponse transmise est le RANG de l'option (`PUT /api/me/certification/
 * answers` attend le bareme de la reponse, et les options sont servies triees
 * par position, valeur croissante). Le bareme lui-meme n'est jamais envoye au
 * navigateur : le connaitre permettrait de choisir la reponse la mieux notee.
 */
export function Quiz({
  questions,
  initialAnswers,
  initialResult,
  threshold,
}: {
  questions: QuizQuestion[];
  initialAnswers: Record<string, number>;
  initialResult: QuizResult | null;
  threshold: number;
}) {
  const router = useRouter();
  const toast = useToast();

  const [answers, setAnswers] = React.useState(initialAnswers);
  const [index, setIndex] = React.useState(() => {
    // On reprend a la premiere question sans reponse, pas au debut.
    const next = questions.findIndex((question) => !(question.id in initialAnswers));
    return next === -1 ? 0 : next;
  });
  const [result, setResult] = React.useState(initialResult);
  const [error, setError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  if (questions.length === 0) {
    return (
      <div className="py-12 text-center text-[15px] text-text/60">
        Le questionnaire ne contient aucune question pour le moment.
      </div>
    );
  }

  if (result) {
    return (
      <div className="py-[30px] text-center">
        <div className="font-mono text-[11px] tracking-[0.16em] text-accent-700 uppercase">
          Résultat de certification
        </div>
        <div className="mt-[26px] inline-block bg-accent-900 px-15 py-10 text-bg">
          <div data-testid="quiz-score" className="font-heading text-[86px] leading-none">
            {result.score}
          </div>
          <div className="mt-1.5 font-mono text-[11px] tracking-[0.16em] uppercase opacity-75">
            score / 100
          </div>
        </div>
        <h1 className="mt-7 text-[38px] uppercase">
          {result.passed ? "Certification obtenue" : "Certification non obtenue"}
        </h1>
        <p className="mx-auto mt-3.5 max-w-[52ch] text-[15.5px] leading-[1.6]">
          {result.passed
            ? "Le badge Aptitudes professionnelles JEB est désormais affiché sur votre profil public et vous remontez dans les filtres « certifiés » du catalogue recruteur."
            : `Le seuil est fixé à ${result.threshold} / 100. Vous pouvez repasser le questionnaire dès maintenant, sans délai de carence.`}
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button
            variant="primary"
            className="h-10"
            onClick={() => {
              router.push("/mon-espace");
              router.refresh();
            }}
          >
            Retour à mon espace
          </Button>
          <Button variant="secondary" className="h-10" onClick={restart} disabled={pending}>
            Repasser
          </Button>
        </div>
      </div>
    );
  }

  const question = questions[index];
  const answered = answers[question.id];
  const isLast = index >= questions.length - 1;

  async function choose(value: number) {
    const previous = answers;
    setAnswers({ ...answers, [question.id]: value });
    setError("");

    try {
      await api("/api/me/certification/answers", {
        method: "PUT",
        body: { answers: { [question.id]: value } },
      });
    } catch (caught) {
      setAnswers(previous);
      setError(errorMessage(caught));
    }
  }

  async function next() {
    if (!isLast) {
      setIndex(index + 1);
      return;
    }

    setPending(true);
    try {
      const submitted = await api<QuizResult>("/api/me/certification/submit", { method: "POST" });
      setResult(submitted);
      router.refresh();
      window.scrollTo(0, 0);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function restart() {
    setPending(true);
    try {
      await api("/api/me/certification/restart", { method: "POST" });
      setAnswers({});
      setIndex(0);
      setResult(null);
      setError("");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <div className="font-mono text-[11px] tracking-[0.16em] text-accent-700 uppercase">
          Certification professionnelle JEB
        </div>
        <div data-testid="quiz-counter" className="font-mono text-xs text-text/55">
          Question {index + 1} / {questions.length}
        </div>
      </div>

      <div className="mt-3.5 h-1 bg-neutral-200">
        <div
          className="h-full bg-accent transition-[width]"
          style={{ width: `${Math.round((index / questions.length) * 100)}%` }}
        />
      </div>

      <h1 className="mt-[34px] text-[34px] leading-[1.15] text-pretty">{question.text}</h1>

      <div className="mt-[26px] flex flex-col gap-px border border-divider bg-divider">
        {question.options.map((option, position) => (
          <RadioOption
            key={option.id}
            name={`q-${question.id}`}
            label={option.label}
            checked={answered === position}
            onSelect={() => choose(position)}
          />
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 border border-accent-600 bg-accent-100 px-3 py-2.5 text-[13px] text-accent-800"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-[26px] flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="secondary"
          className="h-[38px]"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          ← Précédent
        </Button>
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            onClick={() => {
              router.push("/mon-espace");
              toast("Progression enregistrée");
            }}
          >
            Enregistrer et quitter
          </Button>
          <Button
            variant="primary"
            className="h-[38px]"
            disabled={typeof answered !== "number" || pending}
            onClick={next}
          >
            {isLast ? "Valider et calculer le score" : "Suivant →"}
          </Button>
        </div>
      </div>

      <div className="mt-[22px] font-mono text-[10.5px] text-text/48">
        Progression sauvegardée à chaque réponse — reprise possible en cas d&apos;interruption.
        Seuil de certification : {threshold} / 100.
      </div>
    </div>
  );
}
