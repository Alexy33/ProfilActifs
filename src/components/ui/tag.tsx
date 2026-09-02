import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// `.tag` de ds/styles.css. Angles droits : le bloc de fin de la feuille
// remet border-radius a 0 sur tous les composants.
const tagVariants = cva(
  "inline-flex items-center rounded-none text-[11px] tracking-[0.02em] px-2.5 py-[3px]",
  {
    variants: {
      variant: {
        accent: "bg-accent-100 text-accent-800",
        neutral: "bg-neutral-100 text-neutral-800",
        outline: "border border-accent text-accent",
        solid: "bg-accent text-bg",
      },
    },
    defaultVariants: { variant: "accent" },
  },
);

export type TagProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof tagVariants>;

export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant }), className)} {...props} />;
}

/**
 * Meme objet, mais cliquable : les filtres par competence du catalogue et les
 * competences declarees de l'espace demandeur sont des tags qui basculent.
 */
export function TagToggle({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        tagVariants({ variant: active ? "solid" : "outline" }),
        "cursor-pointer font-body transition-colors",
        active ? "hover:bg-accent-600" : "bg-transparent hover:bg-accent/10",
        className,
      )}
      {...props}
    />
  );
}

export { tagVariants };
