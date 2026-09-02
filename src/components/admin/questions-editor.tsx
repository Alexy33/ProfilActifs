"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { LoadedQuestion } from "@/server/services/certification";

/**
 * Bareme du questionnaire.
 *
 * Libelles et ponderations sont modifiables et s'appliquent des la tentative
 * suivante. Les options creees ici portent une valeur egale a leur rang : c'est
 * l'invariant que suit tout le dispositif (cf. le seed), et il permet au
 * questionnaire candidat de repondre sans jamais connaitre le bareme.
 */
const DEFAULT_OPTIONS = ["Réponse A", "Réponse B", "Réponse C", "Réponse D"].map(
  (label, index) => ({ label, value: index }),
);

export function QuestionsEditor({
  questions,
  threshold,
}: {
  questions: LoadedQuestion[];
  threshold: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  return (
    <>
      <div className="mt-1.5 text-[13px] text-text/58">
        Libellés et pondérations — appliqués immédiatement au calcul du score.
      </div>

      <div className="mt-[18px] flex flex-col gap-3">
        {questions.map((question, index) => (
          <QuestionRow key={question.id} question={question} position={index + 1} />
        ))}
      </div>

      <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3.5">
        <ThresholdField value={threshold} />
        <Button
          variant="secondary"
          className="h-8"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await api("/api/admin/questions", {
                method: "POST",
                body: {
                  text: "Nouvelle question à rédiger",
                  weight: 2,
                  options: DEFAULT_OPTIONS,
                },
              });
              router.refresh();
              toast("Question ajoutée");
            } catch (error) {
              toast(errorMessage(error));
            } finally {
              setPending(false);
            }
          }}
        >
          + Ajouter une question
        </Button>
      </div>
    </>
  );
}

/** Une question : libelle et poids, enregistres apres une pause de frappe. */
function QuestionRow({ question, position }: { question: LoadedQuestion; position: number }) {
  const router = useRouter();
  const toast = useToast();
  const [text, setText] = React.useState(question.text);
  const [weight, setWeight] = React.useState(question.weight);
  const saved = React.useRef({ text: question.text, weight: question.weight });

  React.useEffect(() => {
    saved.current = { text: question.text, weight: question.weight };
    setText(question.text);
    setWeight(question.weight);
  }, [question.text, question.weight]);

  React.useEffect(() => {
    const patch: { text?: string; weight?: number } = {};
    if (text !== saved.current.text && text.trim()) patch.text = text;
    if (weight !== saved.current.weight) patch.weight = weight;
    if (Object.keys(patch).length === 0) return;

    const timer = setTimeout(async () => {
      try {
        await api(`/api/admin/questions/${question.id}`, { method: "PATCH", body: patch });
        saved.current = { text, weight };
        router.refresh();
      } catch (error) {
        toast(errorMessage(error));
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [text, weight, question.id, router, toast]);

  const remove = async () => {
    try {
      await api(`/api/admin/questions/${question.id}`, { method: "DELETE" });
      router.refresh();
      toast(`Q${position} supprimée`);
    } catch (error) {
      toast(errorMessage(error));
    }
  };

  return (
    <div className="grid grid-cols-[1fr_76px_auto] items-end gap-2.5">
      <Field label={`Q${position}`} htmlFor={`q-${question.id}`}>
        <Input
          id={`q-${question.id}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <Field label="Poids" htmlFor={`w-${question.id}`}>
        <Input
          id={`w-${question.id}`}
          type="number"
          min={1}
          max={5}
          value={weight}
          onChange={(event) =>
            setWeight(Math.max(1, Math.min(5, Number(event.target.value) || 1)))
          }
        />
      </Field>
      <Button variant="ghost" aria-label={`Supprimer la question ${position}`} onClick={remove}>
        ✕
      </Button>
    </div>
  );
}

/**
 * Seuil de certification.
 *
 * La maquette ne l'affichait qu'en lecture ; `PATCH /api/admin/settings` existe
 * et n'aurait sinon aucune interface, alors que c'est le reglage qui decide de
 * qui obtient le badge.
 */
function ThresholdField({ value }: { value: number }) {
  const router = useRouter();
  const toast = useToast();
  const [threshold, setThreshold] = React.useState(value);
  const saved = React.useRef(value);

  React.useEffect(() => {
    saved.current = value;
    setThreshold(value);
  }, [value]);

  React.useEffect(() => {
    if (threshold === saved.current) return;

    const timer = setTimeout(async () => {
      try {
        await api("/api/admin/settings", {
          method: "PATCH",
          body: { certificationThreshold: threshold },
        });
        saved.current = threshold;
        router.refresh();
        toast(`Seuil de certification : ${threshold} / 100`);
      } catch (error) {
        toast(errorMessage(error));
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [threshold, router, toast]);

  return (
    <label className="flex items-center gap-2.5 font-mono text-[11px] text-text/50">
      Seuil de certification
      <Input
        type="number"
        min={0}
        max={100}
        aria-label="Seuil de certification sur 100"
        className="w-20 min-h-8 text-center font-mono"
        value={threshold}
        onChange={(event) =>
          setThreshold(Math.max(0, Math.min(100, Number(event.target.value) || 0)))
        }
      />
      / 100
    </label>
  );
}
