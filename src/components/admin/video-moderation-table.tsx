"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Tag } from "@/components/ui/tag";
import { useToast } from "@/components/ui/toast";
import type { VideoReviewRow } from "@/server/services/video-moderation";
import type { VideoStatus } from "@/lib/vocabulary";

const STATUS_LABELS: Record<VideoStatus, string> = {
  pending: "En attente",
  approved: "Validée",
  rejected: "Refusée",
};

/**
 * Ecran de moderation A PRIORI des videos (mesure Cabinet du 2026-09-02).
 *
 * Valider ou refuser, avec un motif ENREGISTRE et une trace de qui a decide et
 * quand. Le refus passe par une modale : le motif est obligatoire, et le
 * saisir est le seul moyen de confirmer — c'est lui qui sera communique au
 * candidat dans son espace.
 */
export function VideoModerationTable({ rows }: { rows: VideoReviewRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<VideoReviewRow | null>(null);
  const [reason, setReason] = React.useState("");

  const decide = async (
    row: VideoReviewRow,
    status: "approved" | "rejected",
    motif?: string,
  ) => {
    setPending(row.profileId);
    try {
      await api(`/api/admin/videos/${row.profileId}`, {
        method: "PATCH",
        body: status === "rejected" ? { status, reason: motif } : { status },
      });
      router.refresh();
      toast(`${row.name} — vidéo ${status === "approved" ? "validée" : "refusée"}`);
      setRejecting(null);
      setReason("");
    } catch (error) {
      toast(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  if (rows.length === 0) {
    return <div className="mt-4 text-sm text-text/55">Aucune vidéo déposée.</div>;
  }

  return (
    <>
      <DataTable className="mt-4">
        <thead>
          <tr>
            <Th>Candidat</Th>
            <Th>Vidéo</Th>
            <Th>État</Th>
            <Th>Décision</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Tr key={row.profileId} data-testid="video-review-row">
              <Td>
                <div className="font-medium">{row.name}</div>
                <div className="text-[11.5px] text-text/55">{row.title}</div>
                {row.isMinor ? (
                  <div className="mt-1 font-mono text-[10.5px] text-accent-800">
                    profil mineur — jamais diffusé
                  </div>
                ) : null}
              </Td>

              <Td className="max-w-[240px] font-mono text-[11px] break-all">
                {row.videoUrl ? (
                  // L'administration doit pouvoir VOIR la video pour la moderer :
                  // la route la lui sert meme en attente.
                  <a
                    href={row.videoUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-accent-700 underline underline-offset-2"
                  >
                    {row.videoUrl}
                  </a>
                ) : (
                  "—"
                )}
                {row.seenBeforeReview ? (
                  <div
                    data-testid="seen-before-review"
                    className="mt-1 font-mono text-[10.5px] text-accent-800"
                  >
                    ⚠ consultée avant la mise en place de la modération
                  </div>
                ) : null}
              </Td>

              <Td>
                <Tag variant={row.videoStatus === "approved" ? "solid" : undefined}>
                  {STATUS_LABELS[row.videoStatus]}
                </Tag>
              </Td>

              <Td className="text-[11.5px] text-text/62">
                {row.reviewedAt ? (
                  <>
                    <div>{row.reviewedByName ?? "—"}</div>
                    <div className="font-mono text-[10.5px]">
                      {new Date(row.reviewedAt).toLocaleString("fr-FR")}
                    </div>
                    {row.videoReviewReason ? (
                      <div className="mt-1 italic">« {row.videoReviewReason} »</div>
                    ) : null}
                  </>
                ) : (
                  <span className="text-text/45">non examinée</span>
                )}
              </Td>

              <Td className="whitespace-nowrap">
                {row.videoStatus !== "approved" ? (
                  <Button
                    variant="ghost"
                    disabled={pending === row.profileId}
                    onClick={() => decide(row, "approved")}
                  >
                    Valider
                  </Button>
                ) : null}
                {row.videoStatus !== "rejected" ? (
                  <Button
                    variant="ghost"
                    disabled={pending === row.profileId}
                    onClick={() => {
                      setReason("");
                      setRejecting(row);
                    }}
                  >
                    Refuser
                  </Button>
                ) : null}
              </Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>

      <Dialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title={`Refuser la vidéo — ${rejecting?.name ?? ""}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              disabled={!reason.trim() || pending !== null}
              onClick={() => rejecting && decide(rejecting, "rejected", reason.trim())}
            >
              Refuser et notifier
            </Button>
          </>
        }
      >
        <Field label="Motif du refus" htmlFor="reject-reason">
          <Input
            id="reject-reason"
            placeholder="Ex. : le son couvre les propos tenus."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        <p className="mt-2 text-[12.5px] leading-[1.5] text-text/62">
          Ce motif est enregistré et communiqué au candidat dans son espace. Un refus sans
          motif n&apos;est pas possible.
        </p>
      </Dialog>
    </>
  );
}
