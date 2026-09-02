"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Liens de navigation, avec le soulignement accent sur la section courante.
 *
 * Client uniquement pour `usePathname` : la liste elle-meme est calculee cote
 * serveur, ou le role de la session est connu sans aller-retour.
 */
export interface NavItem {
  label: string;
  href: string;
}

export function NavLinks({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-[22px] md:flex">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "border-b-2 pb-0.5 text-[13.5px] tracking-[0.03em] transition-colors",
              active
                ? "border-accent text-accent"
                : "border-transparent text-text hover:text-accent",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
