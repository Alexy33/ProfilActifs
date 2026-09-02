"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { MIN_SIGNUP_AGE, MINOR_AGE, ageOn } from "@/lib/vocabulary";

/**
 * Regularisation d'un compte cree avant la verification d'age (mesure Cabinet
 * du 2026-09-02, point 1).
 *
 * Ces comptes n'ont pas de date de naissance : leur age est inconnu, ils sont
 * donc traites comme mineurs et retires du catalogue. Ce bandeau explique
 * pourquoi le profil a disparu et permet de le retablir en une saisie — sans
 * quoi le titulaire constaterait un retrait sans cause visible.
 */
export function BirthDateNotice() {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const age = React.useMemo(() => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now()) return null;
    return ageOn(parsed);
  }, [value]);

  const tooYoung = age !== null && age < MIN_SIGNUP_AGE;

  const submit = async () => {
    setError("");
    setPending(true);
    try {
      await api("/api/me/profile", { method: "PATCH", body: { birthDate: value } });
      router.refresh();
      toast("Date de naissance enregistrée");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      data-testid="birthdate-notice"
      className="mt-6 border border-accent-600 bg-accent-100 px-5 py-4"
    >
      <div className="font-heading text-lg text-accent-800 uppercase">
        Date de naissance à renseigner
      </div>
      <p className="mt-2 max-w-[70ch] text-[13.5px] leading-[1.6] text-accent-800">
        Le dispositif vérifie désormais l&apos;âge de ses utilisateurs. Votre compte a été
        créé avant cette mesure : tant que votre date de naissance n&apos;est pas renseignée,
        votre profil n&apos;apparaît pas au catalogue et votre vidéo n&apos;est pas diffusée.
      </p>

      <div className="mt-3.5 flex flex-wrap items-end gap-3">
        <Field label="Date de naissance" htmlFor="regularise-birthdate">
          <Input
            id="regularise-birthdate"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
        <Button
          variant="primary"
          className="h-[38px]"
          disabled={!value || tooYoung || pending}
          onClick={submit}
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      {tooYoung ? (
        <div role="alert" className="mt-2.5 text-[13px] text-accent-800">
          Le dispositif est réservé aux personnes de {MIN_SIGNUP_AGE} ans et plus.
        </div>
      ) : null}

      {age !== null && age >= MIN_SIGNUP_AGE && age < MINOR_AGE ? (
        <div className="mt-2.5 text-[13px] leading-[1.55] text-accent-800">
          Vous avez moins de {MINOR_AGE} ans : votre profil restera hors du catalogue public
          et votre vidéo ne sera pas diffusée. Un référent vous accompagne pour la mise en
          relation avec les recruteurs.
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="mt-2.5 text-[13px] text-accent-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}
