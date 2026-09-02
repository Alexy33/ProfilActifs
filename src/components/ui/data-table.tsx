import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Table de donnees `.table` : en-tete en petites capitales, filets de ligne,
 * survol de rangee. Enveloppee dans un conteneur qui defile horizontalement
 * pour que les tableaux du suivi recruteur ne cassent pas la page en dessous
 * de leur largeur naturelle.
 */
export function DataTable({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-divider px-[7px] py-[7px] text-left",
        "text-[11px] tracking-[0.08em] text-text/60 uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-text/8 px-[7px] py-[7px]", className)} {...props} />;
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-text/4", className)} {...props} />;
}
