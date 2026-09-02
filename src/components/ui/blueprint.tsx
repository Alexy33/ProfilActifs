import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Cadre filaire du systeme "Industry".
 *
 * Toute carte, figure ou plaque du produit passe par ici : le systeme interdit
 * de dessiner un cadre sans ses quatre marques de reperage, et les repeter a la
 * main dans chaque ecran finissait toujours par en oublier une.
 */
export type BlueprintProps = React.HTMLAttributes<HTMLElement> & {
  as?: React.ElementType;
  // React 19 passe `ref` comme une prop ordinaire des composants fonction.
  ref?: React.Ref<HTMLElement>;
};

export function Blueprint({
  className,
  children,
  as: Component = "div",
  ...props
}: BlueprintProps) {
  return (
    <Component className={cn("blueprint", className)} {...props}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </Component>
  );
}
