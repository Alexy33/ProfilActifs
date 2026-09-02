"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api-client";
import { ROLE_HOME } from "@/lib/roles";
import type { UserRole } from "@/lib/vocabulary";

/**
 * Raccourcis de demonstration.
 *
 * Ils ouvrent une VRAIE session better-auth avec les comptes du seed
 * (src/db/seed.ts) : le jury n'a pas de mot de passe a retenir, mais rien
 * n'est simule — le cookie httpOnly est pose comme pour n'importe qui.
 */
const ACCOUNTS: { role: UserRole; label: string; email: string }[] = [
  { role: "candidate", label: "Demandeur", email: "amina@exemple.fr" },
  { role: "recruiter", label: "Recruteur", email: "recruteur@exemple.fr" },
  { role: "admin", label: "Administration", email: "admin@jeb.gouv.fr" },
];

const DEMO_PASSWORD = "demo";

export function DemoAccounts() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState<string | null>(null);

  const signIn = async (email: string, role: UserRole) => {
    setPending(email);
    const { error } = await authClient.signIn.email({ email, password: DEMO_PASSWORD });
    setPending(null);

    if (error) {
      toast(
        error.message
          ? errorMessage(error)
          : "Compte de démonstration absent — lancez « npm run db:seed ».",
      );
      return;
    }

    router.push(ROLE_HOME[role]);
    router.refresh();
    toast("Session ouverte — better-auth");
  };

  return (
    <section className="mt-12 bg-accent-900 px-8 py-[30px] text-bg">
      <div className="font-mono text-[10.5px] tracking-[0.16em] uppercase opacity-70">
        Comptes de démonstration
      </div>
      <div className="mt-[18px] grid gap-5 md:grid-cols-3">
        {ACCOUNTS.map((account) => (
          <div key={account.email} className="border border-bg/28 px-[18px] py-4">
            <div className="font-heading text-[19px] uppercase">{account.label}</div>
            <div className="mt-1.5 font-mono text-[11.5px] opacity-75">{account.email}</div>
            <Button
              variant="secondary"
              className="mt-3.5 h-8 border-bg/40 text-bg hover:bg-bg/10 active:bg-bg/20"
              disabled={pending !== null}
              onClick={() => signIn(account.email, account.role)}
            >
              {pending === account.email ? "Connexion…" : "Se connecter"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
