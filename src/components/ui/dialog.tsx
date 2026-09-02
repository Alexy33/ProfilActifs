"use client";

import * as React from "react";
import { Blueprint } from "./blueprint";

/**
 * Modale `.dialog` posee sur son fond.
 *
 * Fermeture au clic sur le fond, a la touche Echap, et focus renvoye dans la
 * boite a l'ouverture : la maquette ne montre que le fond cliquable, mais une
 * modale sans Echap ni piege a focus est inutilisable au clavier.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    // Le premier controle focusable de la boite recoit le focus : sans cela il
    // reste sur le bouton d'ouverture, derriere le fond.
    boxRef.current?.querySelector<HTMLElement>("textarea, input, button")?.focus();

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-neutral-900/50 p-[14px]"
      onClick={onClose}
    >
      <Blueprint
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className="flex w-[min(520px,100%)] flex-col gap-[10px] bg-bg p-[14px] shadow-[0_12px_32px_rgba(43,43,45,0.22)]"
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
      >
        <div className="font-heading text-xl uppercase">{title}</div>
        {children}
        <div className="mt-[7px] flex justify-end gap-[7px]">{actions}</div>
      </Blueprint>
    </div>
  );
}
