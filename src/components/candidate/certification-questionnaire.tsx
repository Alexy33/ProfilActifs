"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, FileQuestion, Loader2, RotateCcw, Save } from "lucide-react";

type Question = { id: string; text: string; position: number; options: { id: string; label: string }[] };
type State = {
  status: "not_started" | "in_progress" | "submitted";
  answers: Record<string, number>;
  answered: number;
  questionCount: number;
  threshold: number;
  score: number | null;
  passed: boolean | null;
};
type Result = { score: number; threshold: number; passed: boolean; certified: boolean };

export function CertificationQuestionnaire({ initialQuestions, initialState }: { initialQuestions: Question[]; initialState: State }) {
  const questions = initialQuestions;
  const firstEmpty = questions.findIndex((question) => initialState.answers[question.id] === undefined);
  const [state, setState] = useState(initialState);
  const [result, setResult] = useState<Result | null>(initialState.status === "submitted" && initialState.score !== null ? {
    score: initialState.score,
    threshold: initialState.threshold,
    passed: Boolean(initialState.passed),
    certified: Boolean(initialState.passed),
  } : null);
  const [index, setIndex] = useState(firstEmpty < 0 ? Math.max(0, questions.length - 1) : firstEmpty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = questions[index];
  const selected = question && state ? state.answers[question.id] : undefined;
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;

  async function choose(value: number) {
    if (!question || busy) return;
    setBusy(true); setError(null);
    const response = await fetch("/api/me/certification/answers", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: { [question.id]: value } }),
    });
    const data = await response.json();
    if (response.ok) setState(data);
    else setError(data?.error?.message ?? "La réponse n’a pas pu être enregistrée.");
    setBusy(false);
  }

  async function submit() {
    setBusy(true); setError(null);
    const response = await fetch("/api/me/certification/submit", { method: "POST" });
    const data = await response.json();
    if (response.ok) setResult(data);
    else setError(data?.error?.message ?? "Le questionnaire n’a pas pu être validé.");
    setBusy(false);
  }

  async function restart() {
    setBusy(true); setError(null);
    const response = await fetch("/api/me/certification/restart", { method: "POST" });
    const data = await response.json();
    if (response.ok) { setState(data); setResult(null); setIndex(0); }
    else setError(data?.error?.message ?? "Impossible de recommencer le questionnaire.");
    setBusy(false);
  }

  if (questions.length === 0) {
    return <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center"><FileQuestion className="size-10 text-[#1B3A6B]" /><h1 className="mt-5 text-2xl font-bold text-[#2d3748]">Questionnaire indisponible</h1><p className="mt-3 text-[#718096]">Aucune question n’est configurée. Demandez à un administrateur d’ajouter le questionnaire.</p><Link href="/candidate" className="mt-6 font-semibold text-[#1B3A6B]">Retour à mon espace</Link></main>;
  }

  if (result) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-12 md:px-10">
        <section className="w-full px-2 py-8 text-center md:px-8 md:py-12">
          <div className={`mx-auto flex size-16 items-center justify-center rounded-2xl ${result.passed ? "bg-[#dff7e9] text-[#17603a]" : "bg-[#fff0d9] text-[#8a5208]"}`}><BadgeCheck className="size-8" /></div>
          <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#718096]">Résultat de certification</p>
          <p className="mt-5 text-7xl font-extrabold tracking-tight text-[#1B3A6B]">{result.score}<span className="text-2xl text-[#718096]"> / 100</span></p>
          <h1 className="mt-6 text-3xl font-extrabold uppercase text-[#2d3748] md:text-4xl">{result.passed ? "Certification obtenue !" : "Continuez vos efforts"}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#718096]">{result.passed ? "Votre badge JEB est maintenant visible sur votre profil public." : `Le seuil est de ${result.threshold}/100. Vous pouvez repasser le questionnaire sans délai.`}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/candidate" className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#1B3A6B] px-6 font-semibold text-white hover:bg-[#273D4F]">Retour à mon espace</Link>
            <button type="button" onClick={restart} disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#1B3A6B]/25 px-6 font-semibold text-[#2d3748] hover:bg-white disabled:opacity-60"><RotateCcw className="size-4" /> Repasser</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 md:px-10 md:pt-12">
      <Link href="/candidate" className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B3A6B] hover:text-[#273D4F]"><ArrowLeft className="size-4" /> Retour à mon espace</Link>
      <header className="mt-8 flex items-end justify-between gap-5">
        <div><p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">Certification professionnelle JEB</p><h1 className="mt-3 text-3xl font-extrabold uppercase text-[#2d3748] md:text-5xl">Valorisez vos <span className="text-[#1B3A6B]">aptitudes.</span></h1></div>
        <p className="shrink-0 font-mono text-xs font-semibold text-[#718096]">{index + 1} / {questions.length}</p>
      </header>

      <div className="mt-7 h-2 overflow-hidden rounded-full bg-[#d4dee9]"><div className="h-full rounded-full bg-[#1B3A6B] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>

      <section className="mt-8 border-t border-[#1B3A6B]/15 pt-8">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-[#D1DEF0] font-mono text-sm font-bold text-[#1B2D3E]">{String(index + 1).padStart(2, "0")}</span><span className="inline-flex items-center gap-2 text-xs text-[#718096]"><Save className="size-3.5" /> Réponse sauvegardée automatiquement</span></div>
        <h2 className="mt-7 max-w-3xl text-2xl font-bold leading-snug text-[#2d3748] md:text-3xl">{question.text}</h2>
        <div className="mt-8 grid gap-3">
          {question.options.map((option, optionIndex) => {
            const active = selected === optionIndex;
            return <button key={option.id} type="button" onClick={() => void choose(optionIndex)} disabled={busy} className={`flex min-h-16 items-center gap-4 rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-colors md:text-base ${active ? "border-[#1B3A6B] bg-[#D1DEF0] text-[#1B2D3E]" : "border-[#1B3A6B]/15 bg-white text-[#4a5568] hover:border-[#1B3A6B]/50 hover:bg-[#F5F9FE]"}`}><span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#1B3A6B] bg-[#1B3A6B] text-white" : "border-[#1B3A6B]/25"}`}>{active && <Check className="size-3.5" />}</span>{option.label}</button>;
          })}
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl bg-[#ffe8ef] px-4 py-3 text-sm text-[#8a3f5b]">{error}</p>}
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-[#1B3A6B]/15 pt-6">
          <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0 || busy} className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#4a5568] hover:bg-white disabled:opacity-40"><ArrowLeft className="size-4" /> Précédent</button>
          {index < questions.length - 1 ? <button type="button" onClick={() => setIndex((value) => value + 1)} disabled={selected === undefined || busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1B3A6B] px-5 text-sm font-semibold text-white hover:bg-[#273D4F] disabled:opacity-40">Suivant <ArrowRight className="size-4" /></button> : <button type="button" onClick={submit} disabled={selected === undefined || busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1B3A6B] px-5 text-sm font-semibold text-white hover:bg-[#273D4F] disabled:opacity-40">{busy && <Loader2 className="size-4 animate-spin" />} Valider le questionnaire</button>}
        </div>
      </section>
    </main>
  );
}
