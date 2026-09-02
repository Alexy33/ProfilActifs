"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Controle segmente `.seg` : un groupe de boutons radio natifs deguises.
 *
 * L'etat coche vient du `<input type="radio">` cache, pas d'une classe posee
 * en JavaScript — le clavier (fleches, Tab) fonctionne donc sans code.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  className,
}: {
  name: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex overflow-hidden rounded-none border border-divider", className)}>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 py-[7px]",
            "text-[13px] transition-colors",
            "border-l border-divider first:border-l-0",
            option.value === value
              ? "bg-accent text-bg"
              : "hover:bg-text/7 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-accent",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
