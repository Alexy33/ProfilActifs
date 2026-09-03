"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { MAJORITY_AGE, MINIMUM_AGE, ageOn, latestAllowedBirthDate } from "@/lib/age";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Age declare, recalcule a chaque frappe : sert a bloquer l'envoi et a
  // afficher la mention d'information des 16-18 ans (R.1). Le serveur refait
  // le meme controle — celui-ci n'est qu'un confort de saisie.
  const declaredAge = ageOn(birthDate);
  const tooYoung = declaredAge !== null && declaredAge < MINIMUM_AGE;
  const isMinorApplicant =
    declaredAge !== null && declaredAge >= MINIMUM_AGE && declaredAge < MAJORITY_AGE;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    // Blocage strict avant tout appel reseau : inutile d'envoyer une
    // inscription que le serveur refusera, et le message est plus clair ici.
    if (tooYoung) {
      setError(
        `L'inscription est réservée aux personnes de ${MINIMUM_AGE} ans et plus.`,
      );
      return;
    }

    if (declaredAge === null) {
      setError("Indiquez une date de naissance valide.");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signUp.email({ name, email, password, birthDate });

      if (result.error) {
        setError(result.error.message ?? "Impossible de créer le compte.");
        setLoading(false);
        return;
      }

      router.push("/candidate");
      router.refresh();
    } catch {
      setError("Une erreur inattendue est survenue. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="grid gap-5">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-base text-destructive"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="name" className="text-sm text-[#2d3748]">Nom complet</Label>

          <Input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jean Dupont"
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect="off"
            disabled={loading}
            required
            className="h-11 rounded-xl border-0 bg-[#ebf0f7] px-3.5 text-base shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] placeholder:text-[#718096] focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-[#1B3A6B]/30 md:text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm text-[#2d3748]">Adresse e-mail</Label>

          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jean@exemple.fr"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={loading}
            required
            className="h-11 rounded-xl border-0 bg-[#ebf0f7] px-3.5 text-base shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] placeholder:text-[#718096] focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-[#1B3A6B]/30 md:text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="birthDate" className="text-sm text-[#2d3748]">Date de naissance</Label>

          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            max={latestAllowedBirthDate()}
            autoComplete="bday"
            disabled={loading}
            required
            aria-describedby="birthDate-help"
            aria-invalid={tooYoung || undefined}
            className="h-11 rounded-xl border-0 bg-[#ebf0f7] px-3.5 text-base shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] placeholder:text-[#718096] focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-[#1B3A6B]/30 md:text-base"
          />

          <p id="birthDate-help" className="text-sm text-[#718096]">
            L&apos;inscription est réservée aux personnes de {MINIMUM_AGE} ans et plus.
          </p>

          {tooYoung ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              Vous devez avoir au moins {MINIMUM_AGE} ans pour créer un compte sur ProfilsActifs.
            </p>
          ) : null}

          {/*
            Parcours distinct 16-18 ans (R.1) : la mention est affichee des que
            la date declaree tombe dans cette tranche, avant meme l'envoi, pour
            que la personne sache a quoi elle s'engage au moment ou elle decide.
          */}
          {isMinorApplicant ? (
            <div
              role="note"
              className="rounded-lg border border-[#1B3A6B]/20 bg-[#1B3A6B]/5 px-4 py-3 text-sm text-[#2d3748]"
            >
              <p className="font-medium">Vous avez moins de {MAJORITY_AGE} ans</p>
              <p className="mt-1 text-[#4A6B8A]">
                Votre compte est créé normalement, mais votre présentation vidéo ne sera pas
                diffusée publiquement : elle reste visible de vous seul et de l&apos;administration.
                Votre profil n&apos;apparaît pas dans le catalogue consultable sans compte recruteur.
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password" className="text-sm text-[#2d3748]">Mot de passe</Label>

          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
            minLength={8}
            disabled={loading}
            required
            className="h-11 rounded-xl border-0 bg-[#ebf0f7] px-3.5 text-base shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] placeholder:text-[#718096] focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-[#1B3A6B]/30 md:text-base"
          />
          <p className="text-sm text-[#718096]">
            Doit contenir au moins 8 caractères.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading || tooYoung}
          className="mt-1 h-11 w-full rounded-xl bg-[#1B3A6B] text-base text-white shadow-[6px_6px_12px_#c5d1e0,-6px_-6px_12px_#ffffff] hover:bg-[#273D4F] hover:shadow-[inset_3px_3px_6px_#273D4F,inset_-3px_-3px_6px_#4A6B8A]"
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : null}
          {loading ? "Création du compte..." : "Créer le compte"}
        </Button>
      </form>
      <p className="text-center text-base text-[#718096]">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-[#273D4F] underline underline-offset-4 transition-colors hover:text-[#1B3A6B]"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
