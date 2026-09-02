import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Rangee de compteurs des tableaux de bord.
 *
 * Les cellules ne sont pas separees par une bordure mais par la couleur de
 * fond du conteneur qui transparait dans une grille a `gap: 1px` — c'est ce
 * qui donne le quadrillage continu de la maquette, sans doubler les filets.
 */
export interface Stat {
  value: React.ReactNode;
  label: string;
}

/** « entretiens planifiés » -> « entretiens-planifies », pour un selecteur stable. */
function slug(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function StatGrid({
  stats,
  columns = 4,
  bordered = true,
  className,
}: {
  stats: readonly Stat[];
  columns?: 2 | 3 | 4;
  bordered?: boolean;
  className?: string;
}) {
  const cols = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" }[columns];

  return (
    <div
      className={cn("grid gap-px bg-divider", cols, bordered && "border border-divider", className)}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-bg p-5">
          <div
            data-testid={`stat-${slug(stat.label)}`}
            className="font-heading text-[38px] leading-none"
          >
            {stat.value}
          </div>
          <div className="mt-1 text-[12.5px] text-text/58">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
