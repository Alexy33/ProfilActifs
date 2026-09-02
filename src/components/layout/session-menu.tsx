"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Bloc de droite de l'en-tete : identite, notifications, sortie de session.
 *
 * Apres `signOut`, `router.refresh()` force le re-rendu des composants serveur
 * pour que l'en-tete et les pages relisent la session — sans cela l'interface
 * continuerait d'afficher l'ancien role jusqu'a un rechargement complet.
 */
export function SessionMenu({
  name,
  roleLabel,
  isCandidate,
  unread,
}: {
  name: string | null;
  roleLabel: string | null;
  isCandidate: boolean;
  unread: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState(false);

  if (!name) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" className="h-[34px]">
          <Link href="/connexion">Connexion</Link>
        </Button>
        <Button asChild variant="primary" marks className="h-[34px]">
          <Link href="/connexion?mode=inscription">Créer un profil</Link>
        </Button>
      </div>
    );
  }

  const signOut = async () => {
    setPending(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
    toast("Session fermée");
    setPending(false);
  };

  return (
    <div className="flex items-center gap-3">
      {isCandidate ? (
        <Button asChild variant="secondary" className="relative h-[34px]">
          <Link href="/mon-espace#notifications">
            Notifications
            {unread > 0 ? (
              <span
                data-testid="unread-count"
                className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center bg-accent px-[5px] text-[11px] text-bg"
              >
                {unread}
              </span>
            ) : null}
          </Link>
        </Button>
      ) : null}

      <div className="hidden text-right leading-[1.15] sm:block">
        <div data-testid="session-name" className="text-[13px] font-medium">
          {name}
        </div>
        <div className="font-mono text-[10px] tracking-[0.1em] text-accent-700 uppercase">
          {roleLabel}
        </div>
      </div>

      <Button variant="ghost" className="h-[34px]" onClick={signOut} disabled={pending}>
        Déconnexion
      </Button>
    </div>
  );
}
