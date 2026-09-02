"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { FavoriteRow } from "@/server/services/dashboard";

/** Liste des favoris, avec retrait direct. */
export function FavoritesList({ items }: { items: FavoriteRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState<string | null>(null);

  if (items.length === 0) {
    return <div className="mt-3.5 text-sm text-text/55">Aucun favori enregistré.</div>;
  }

  const remove = async (profileId: string, name: string) => {
    setPending(profileId);
    try {
      await api(`/api/me/favorites/${profileId}`, { method: "DELETE" });
      router.refresh();
      toast(`${name} retiré des favoris`);
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-px bg-divider">
      {items.map(({ profile }) => (
        <div key={profile.id} className="flex items-center gap-3 bg-bg px-0.5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-medium">{profile.name}</div>
            <div className="text-[11.5px] text-text/55">{profile.title}</div>
          </div>
          <Button asChild variant="ghost">
            <Link href={`/profils/${profile.id}`}>Voir</Link>
          </Button>
          <Button
            variant="ghost"
            aria-label={`Retirer ${profile.name} des favoris`}
            disabled={pending === profile.id}
            onClick={() => remove(profile.id, profile.name)}
          >
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}
