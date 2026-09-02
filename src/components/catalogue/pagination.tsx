import Link from "next/link";
import { Button } from "@/components/ui/button";
import { catalogHref } from "@/lib/catalog-params";
import type { CatalogFilters, CatalogResult } from "@/server/services/profiles";

/**
 * Pagination du catalogue.
 *
 * Des liens, pas des boutons : la page suivante est prechargee par Next.js au
 * survol, et reste ouvrable dans un nouvel onglet.
 */
export function Pagination({
  filters,
  meta,
}: {
  filters: CatalogFilters;
  meta: CatalogResult["meta"];
}) {
  const first = meta.page <= 1;
  const last = meta.page >= meta.totalPages;

  return (
    <div className="flex gap-2">
      {first ? (
        <Button variant="secondary" className="h-8" disabled>
          ← Précédent
        </Button>
      ) : (
        <Button asChild variant="secondary" className="h-8">
          <Link href={catalogHref({ ...filters, page: meta.page - 1 })}>← Précédent</Link>
        </Button>
      )}

      {last ? (
        <Button variant="secondary" className="h-8" disabled>
          Suivant →
        </Button>
      ) : (
        <Button asChild variant="secondary" className="h-8">
          <Link href={catalogHref({ ...filters, page: meta.page + 1 })}>Suivant →</Link>
        </Button>
      )}
    </div>
  );
}
