"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/**
 * Le seul composant client de la demo. Il verifie en direct les deux briques
 * qui ne se prouvent pas par un rendu statique : better-auth (inscription,
 * connexion, session persistante) et l'ecriture en base.
 */
export function StackPanel({
  pings,
  users,
  sessionEmail,
  sessionName,
}: {
  pings: number;
  users: number;
  sessionEmail: string | null;
  sessionName: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { isPending } = useSession();

  const [email, setEmail] = useState("demo@exemple.fr");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => startTransition(() => router.refresh());

  async function signIn() {
    setBusy(true);
    setError("");
    const res = await authClient.signIn.email({ email, password });
    // Premiere utilisation : le compte n'existe pas encore, on le cree.
    if (res.error) {
      const created = await authClient.signUp.email({ name: "Compte de demo", email, password });
      if (created.error) setError(created.error.message ?? "Echec de l'authentification.");
    }
    setBusy(false);
    refresh();
  }

  async function logout() {
    setBusy(true);
    await authClient.signOut();
    setBusy(false);
    refresh();
  }

  async function sendPing() {
    setBusy(true);
    await fetch("/api/ping", { method: "POST" });
    setBusy(false);
    refresh();
  }

  return (
    <div className="mt-9 flex flex-col gap-6">
      <ul className="flex flex-col border border-divider">
        <Row name="Next.js 16" detail="App Router · composants serveur" />
        <Row name="SQLite + Drizzle" detail={`${users} comptes · ${pings} pings enregistres`} />
        <Row
          name="better-auth"
          detail={
            isPending ? "lecture…" : sessionEmail ? `session : ${sessionEmail}` : "aucune session"
          }
        />
        <Row name="Tailwind v4 + shadcn" detail="tokens du systeme Industry" />
        <Row name="Scalar" detail="documentation sur /api/docs" />
        <Row name="Playwright + Vitest" detail="npm run test:e2e · npm test" />
      </ul>

      <div className="flex flex-col gap-4 border border-divider p-6">
        <div className="font-mono text-[10px] tracking-[0.14em] text-accent-700 uppercase">
          Verification interactive
        </div>

        {sessionEmail ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm" data-testid="session-state">
              Connecte : <strong>{sessionName}</strong>{" "}
              <span className="font-mono text-[11px] text-text/55">{sessionEmail}</span>
            </span>
            <Button className="ml-auto" onClick={logout} disabled={busy}>
              Se deconnecter
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-xs text-text/70">
              Adresse e-mail
              <input
                aria-label="Adresse e-mail"
                className="mt-1.5 min-h-9 w-56 border border-divider bg-surface px-2.5 text-sm focus-visible:border-accent focus-visible:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col text-xs text-text/70">
              Mot de passe
              <input
                aria-label="Mot de passe"
                type="password"
                className="mt-1.5 min-h-9 w-44 border border-divider bg-surface px-2.5 text-sm focus-visible:border-accent focus-visible:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button variant="default" onClick={signIn} disabled={busy}>
              Se connecter
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="border border-accent-600 bg-accent-100 px-3 py-2 text-[13px] text-accent-800">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 border-t border-divider pt-4">
          <span className="text-sm text-text/70">Ecriture en base :</span>
          <Button onClick={sendPing} disabled={busy}>
            Ping la base
          </Button>
          <span className="font-mono text-[11px] text-text/55" data-testid="ping-count">
            {pings} ping(s)
          </span>
        </div>

        <p className="font-mono text-[10.5px] text-text/50">
          Le compte de demo est cree automatiquement a la premiere connexion.
        </p>
      </div>
    </div>
  );
}

function Row({ name, detail }: { name: string; detail: string }) {
  return (
    <li className="flex items-baseline gap-3 border-b border-divider px-5 py-3 text-sm last:border-0">
      <span className="text-accent">✓</span>
      <span className="font-medium">{name}</span>
      <span className="ml-auto text-right font-mono text-[11px] text-text/55">{detail}</span>
    </li>
  );
}
