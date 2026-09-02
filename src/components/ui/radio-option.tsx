"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Reponse du questionnaire (`.radio` + `.dot`).
 *
 * La pastille est un `<i>` frere de l'input, stylee via `peer-checked` : le
 * radio natif reste la source de verite, y compris pour les lecteurs d'ecran.
 */
export function RadioOption({
  name,
  label,
  checked,
  onSelect,
  className,
}: {
  name: string;
  label: React.ReactNode;
  checked: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <label
      data-testid="quiz-option"
      className={cn(
        "group flex cursor-pointer items-center gap-3 bg-bg px-[18px] py-4 text-[15px]",
        "transition-colors hover:bg-accent/5",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="peer sr-only"
      />
      <i
        aria-hidden
        className={cn(
          "size-4 flex-none rounded-full border-[1.5px] border-divider transition-colors",
          "group-hover:border-accent",
          "peer-checked:border-accent peer-checked:bg-accent peer-checked:shadow-[inset_0_0_0_4px_var(--color-bg)]",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
        )}
      />
      <span>{label}</span>
    </label>
  );
}
