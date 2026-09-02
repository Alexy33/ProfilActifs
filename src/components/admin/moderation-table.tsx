"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { Tag } from "@/components/ui/tag";
import { useToast } from "@/components/ui/toast";
import type { ModerationRow } from "@/server/services/dashboard";
import type { ProfileStatus } from "@/lib/vocabulary";

const STATUS_LABELS: Record<ProfileStatus, string> = {
  published: "Publié",
  pending: "En attente",
  removed: "Retiré",
};

/**
 * File de moderation.
 *
 * Un profil publie devient visible au catalogue immediatement : la table est
 * la seule vue du produit qui expose les profils non publies.
 */
export function ModerationTable({ rows }: { rows: ModerationRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState<string | null>(null);

  const moderate = async (row: ModerationRow, status: ProfileStatus, label: string) => {
    setPending(row.id);
    try {
      await api(`/api/admin/profiles/${row.id}`, { method: "PATCH", body: { status } });
      router.refresh();
      toast(`${row.name} — ${label}`);
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  if (rows.length === 0) {
    return <div className="mt-4 text-sm text-text/55">Aucun profil enregistré.</div>;
  }

  return (
    <DataTable className="mt-4">
      <thead>
        <tr>
          <Th>Profil</Th>
          <Th>Vidéo</Th>
          <Th>État</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.id} data-testid="profile-moderation-row">
            <Td>
              <div className="font-medium">{row.name}</div>
              <div className="text-[11.5px] text-text/55">{row.title}</div>
              {/* Un profil de mineur reste hors catalogue meme publie : le
                  signaler evite qu'un moderateur croie l'avoir mis en ligne. */}
              {row.isMinor ? (
                <div data-testid="minor-flag" className="mt-1 font-mono text-[10.5px] text-accent-800">
                  {row.birthDateMissing
                    ? "date de naissance manquante — hors catalogue"
                    : "profil mineur — hors catalogue public"}
                </div>
              ) : null}
            </Td>
            <Td className="font-mono text-[11px] break-all">{row.videoUrl || "—"}</Td>
            <Td>
              <Tag>{STATUS_LABELS[row.status]}</Tag>
            </Td>
            <Td className="whitespace-nowrap">
              {row.status === "published" ? (
                <Button
                  variant="ghost"
                  disabled={pending === row.id}
                  onClick={() => moderate(row, "removed", "profil retiré")}
                >
                  Retirer
                </Button>
              ) : null}

              {row.status === "pending" ? (
                <span className="inline-flex gap-1.5">
                  <Button
                    variant="ghost"
                    disabled={pending === row.id}
                    onClick={() => moderate(row, "published", "profil publié")}
                  >
                    Publier
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending === row.id}
                    onClick={() => moderate(row, "removed", "profil retiré")}
                  >
                    Retirer
                  </Button>
                </span>
              ) : null}

              {row.status === "removed" ? (
                <Button
                  variant="ghost"
                  disabled={pending === row.id}
                  onClick={() => moderate(row, "published", "profil rétabli")}
                >
                  Rétablir
                </Button>
              ) : null}

              {row.status === "published" ? (
                <Button asChild variant="ghost">
                  <Link href={`/profils/${row.id}`}>Ouvrir</Link>
                </Button>
              ) : null}
            </Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
