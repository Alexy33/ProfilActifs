"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Etoile « favori » du recruteur.
 *
 * L'etat est optimiste : l'etoile bascule immediatement, et n'est remise dans
 * son etat precedent que si l'API refuse. `router.refresh()` reconcilie ensuite
 * la page serveur (le compteur du tableau de bord, notamment).
 */
export function FavoriteButton({
  profileId,
  favorited,
  variant = "icon",
  className,
}: {
  profileId: string;
  favorited: boolean;
  variant?: "icon" | "block";
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [active, setActive] = React.useState(favorited);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => setActive(favorited), [favorited]);

  const toggle = async () => {
    const next = !active;
    setActive(next);
    setPending(true);

    try {
      await api(`/api/me/favorites/${profileId}`, { method: next ? "PUT" : "DELETE" });
      router.refresh();
      toast(next ? "Ajouté aux favoris" : "Retiré des favoris");
    } catch (error) {
      setActive(!next);
      toast(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const label = active ? "Retirer des favoris" : "Ajouter aux favoris";

  return (
    <Button
      variant="secondary"
      onClick={toggle}
      disabled={pending}
      aria-pressed={active}
      aria-label={variant === "icon" ? label : undefined}
      className={cn(variant === "icon" ? "size-8 p-0" : "h-9 w-full", className)}
    >
      {variant === "icon" ? (active ? "★" : "☆") : `${active ? "★" : "☆"} ${label}`}
    </Button>
  );
}
