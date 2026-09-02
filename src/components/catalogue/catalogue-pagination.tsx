import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Pagination du catalogue.
 *
 * Rendue en liens plutot qu'en boutons : chaque page est une URL a part
 * entiere, indexable et partageable, ce que le CDC (3.4) attend d'un feed
 * pagine. Les parametres de filtre courants sont reconduits tels quels.
 */
interface CataloguePaginationProps {
  page: number;
  totalPages: number;
  /** Parametres de filtre courants, sans `page`. */
  params: URLSearchParams;
}

export function CataloguePagination({ page, totalPages, params }: CataloguePaginationProps) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const next = new URLSearchParams(params.toString());
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));
    const query = next.toString();
    return query ? `/catalogue?${query}` : "/catalogue";
  };

  const linkClassName =
    "inline-flex h-12 items-center gap-2 rounded-2xl border border-[#5980a6]/15 bg-white px-5 text-sm font-semibold text-[#2d3748] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#5980a6]/35 hover:text-[#416180]";
  const disabledClassName =
    "inline-flex h-12 cursor-not-allowed items-center gap-2 rounded-2xl border border-[#5980a6]/10 px-5 text-sm font-semibold text-[#718096]/50";

  return (
    <nav
      aria-label="Pagination du catalogue"
      className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[#5980a6]/10 pt-8"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} scroll={false} className={linkClassName}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Précédent
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClassName}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Précédent
        </span>
      )}

      <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#718096]">
        Page {page} / {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={href(page + 1)} scroll={false} className={linkClassName}>
          Suivant
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClassName}>
          Suivant
          <ArrowRight aria-hidden="true" className="size-4" />
        </span>
      )}
    </nav>
  );
}
