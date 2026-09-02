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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);

    const result =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password, role });

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
          disabled={pending}
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
