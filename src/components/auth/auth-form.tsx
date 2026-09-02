"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { Blueprint } from "@/components/ui/blueprint";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { ROLE_HOME } from "@/lib/roles";
import type { UserRole } from "@/lib/vocabulary";
import { MIN_SIGNUP_AGE, MINOR_AGE, ageOn } from "@/lib/vocabulary";

/**
 * Formulaire de connexion et d'inscription.
 *
 * L'inscription transmet le role choisi : `databaseHooks.user.create` dans
 * src/lib/auth.ts ramene tout role inattendu a « candidate » et cree le profil
 * du demandeur dans la foulee — il n'y a donc rien a creer ici en plus.
 */
export function AuthForm({ signup }: { signup: boolean }) {
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = React.useState<"login" | "signup">(signup ? "signup" : "login");
  const [role, setRole] = React.useState<Extract<UserRole, "candidate" | "recruiter">>("candidate");
  const [name, setName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError("");
    // L'URL suit le mode affiche, pour que la page reste rechargeable telle quelle.
    router.replace(next === "signup" ? "/connexion?mode=inscription" : "/connexion");
  };

  // Age declare, pour l'affichage du parcours 16-18 ans. `null` tant que la
  // date est incomplete ou invalide.
  const declaredAge = React.useMemo(() => {
    if (!birthDate) return null;
    const parsed = new Date(`${birthDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now()) return null;
    return ageOn(parsed);
  }, [birthDate]);

  const tooYoung = declaredAge !== null && declaredAge < MIN_SIGNUP_AGE;
  const isMinorSignup =
    declaredAge !== null && declaredAge >= MIN_SIGNUP_AGE && declaredAge < MINOR_AGE;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    // Refus cote client : message immediat plutot qu'un aller-retour. Le
    // serveur applique la meme regle et reste seul juge.
    if (mode === "signup" && tooYoung) {
      setError(`L'inscription est réservée aux personnes de ${MIN_SIGNUP_AGE} ans et plus.`);
      return;
    }

    setPending(true);

    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            name,
            email,
            password,
            role,
            // Le serveur revalide l'age : ce champ ne fait qu'eviter un
            // aller-retour, il ne fait pas foi.
            birthDate: new Date(`${birthDate}T00:00:00Z`),
          });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "L'authentification a échoué.");
      return;
    }

    // A l'inscription le role demande fait foi ; a la connexion c'est celui
    // que porte la session qui decide de la destination.
    const landing =
      mode === "signup"
        ? ROLE_HOME[role]
        : ROLE_HOME[(result.data?.user as { role?: UserRole })?.role ?? "candidate"];

    router.push(landing);
    router.refresh();
    toast(mode === "signup" ? "Compte créé — bienvenue" : "Session ouverte — better-auth");
  };

  return (
    <Blueprint as="form" className="p-[30px]" onSubmit={submit}>
      <Segmented
        name="authmode"
        className="w-full"
        value={mode}
        onChange={switchMode}
        options={[
          { value: "login", label: "Connexion" },
          { value: "signup", label: "Inscription" },
        ]}
      />

      <div className="mt-[22px] flex flex-col gap-3.5">
        {mode === "signup" ? (
          <>
            <Field label="Je suis">
              <Segmented
                name="role"
                className="w-full"
                value={role}
                onChange={setRole}
                options={[
                  { value: "candidate", label: "Demandeur d'emploi" },
                  { value: "recruiter", label: "Recruteur" },
                ]}
              />
            </Field>
            <Field label="Nom complet" htmlFor="name">
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Amina Berthier"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            <Field label="Date de naissance" htmlFor="birthDate">
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                autoComplete="bday"
                required
                // Empeche de saisir une date future depuis le selecteur.
                max={new Date().toISOString().slice(0, 10)}
                aria-describedby="birthDate-help"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </Field>

            <div id="birthDate-help" className="-mt-1 text-[11.5px] leading-[1.5] text-text/55">
              Le dispositif est réservé aux personnes de {MIN_SIGNUP_AGE} ans et plus.
            </div>

            {tooYoung ? (
              <div
                role="alert"
                data-testid="age-blocked"
                className="border border-accent-600 bg-accent-100 px-3 py-2.5 text-[13px] leading-[1.5] text-accent-800"
              >
                L&apos;inscription est réservée aux personnes de {MIN_SIGNUP_AGE} ans et plus.
                Aucun compte ne sera créé.
              </div>
            ) : null}

            {/* Parcours distinct 16-18 ans : mention d'information adaptée, et
                la vidéo n'est pas publiée par défaut. */}
            {isMinorSignup ? (
              <div
                data-testid="minor-notice"
                className="border border-accent bg-accent-100/60 px-3 py-2.5 text-[12.5px] leading-[1.55] text-accent-800"
              >
                <strong>Vous avez moins de {MINOR_AGE} ans.</strong> Votre profil ne sera pas
                affiché dans le catalogue public et votre vidéo de présentation ne sera pas
                diffusée. Vous pouvez utiliser le dispositif et passer la certification ; un
                référent vous accompagnera pour la mise en relation avec les recruteurs.
              </div>
            ) : null}
          </>
        ) : null}

        <Field label="Adresse e-mail" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.fr"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        <Field label="Mot de passe" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="••••••••"
            required
            minLength={4}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        {error ? (
          <div
            role="alert"
            className="border border-accent-600 bg-accent-100 px-3 py-2.5 text-[13px] text-accent-800"
          >
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          marks
          disabled={pending || (mode === "signup" && tooYoung)}
          className="h-[42px] w-full text-[15px]"
        >
          {mode === "signup" ? "Créer le compte" : "Ouvrir la session"}
        </Button>

        <div className="text-center text-xs text-text/55">
          Démo : mot de passe <strong>demo</strong> pour les comptes du jeu d&apos;essai.
        </div>
      </div>
    </Blueprint>
  );
}
