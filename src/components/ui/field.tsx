import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Champs de formulaire du systeme "Industry" (`.field` / `.input`).
 *
 * Les controles restent natifs : un `<select>` reste un `<select>`, un
 * `<textarea>` reste un `<textarea>`. Aucun JavaScript n'est necessaire pour
 * qu'ils fonctionnent, et l'accessibilite clavier vient du navigateur.
 */

const INPUT_CLASS =
  "w-full min-h-9 rounded-none border border-divider bg-surface px-2.5 py-1.5 text-sm " +
  "text-text caret-accent transition-colors " +
  "hover:border-text/45 focus-visible:border-accent focus-visible:outline-offset-0 " +
  "disabled:opacity-45";

export function Field({
  label,
  htmlFor,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label: React.ReactNode; htmlFor?: string }) {
  return (
    <div className={cn("min-w-0", className)} {...props}>
      <label htmlFor={htmlFor} className="mb-[5px] block text-xs text-text/70">
        {label}
      </label>
      {children}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(INPUT_CLASS, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(INPUT_CLASS, "cursor-pointer", className)} {...props} />
));
Select.displayName = "Select";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(INPUT_CLASS, "min-h-[90px] resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export { INPUT_CLASS };
