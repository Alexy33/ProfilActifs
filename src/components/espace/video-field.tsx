"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage, upload } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { VideoFrame } from "@/components/profil/video-frame";
import {
  ACCEPTED_VIDEO_MIME,
  MAX_VIDEO_BYTES,
  VIDEO_ACCEPT,
  describeVideo,
  formatBytes,
} from "@/lib/video";
import type { VideoStatus } from "@/lib/vocabulary";

/**
 * Video de presentation : lien externe OU fichier televerse.
 *
 * Les deux chemins n'ont pas la meme route (`PATCH /api/me/profile` pour une
 * URL, `PUT /api/me/profile/video` pour un fichier) et ne peuvent pas partager
 * l'enregistrement automatique du reste du formulaire : c'est pourquoi ce
 * champ vit a part de `ProfileForm`.
 *
 * Quand une video est televersee, `videoUrl` est fabriquee par le serveur
 * (`/api/videos/{id}?t=…`). Le champ URL disparait alors : la laisser
 * modifiable inviterait a ecraser a la main une adresse interne.
 */
export function VideoField({
  videoUrl,
  videoStatus,
  videoReviewReason,
  isMinor,
}: {
  videoUrl: string | null;
  videoStatus: VideoStatus;
  videoReviewReason: string | null;
  isMinor: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const fileInput = React.useRef<HTMLInputElement>(null);

  const source = describeVideo(videoUrl);
  const uploaded = source.kind === "uploaded";

  const [url, setUrl] = React.useState(uploaded ? "" : (videoUrl ?? ""));
  const [busy, setBusy] = React.useState<"upload" | "delete" | null>(null);
  const [error, setError] = React.useState("");
  const saved = React.useRef(uploaded ? "" : (videoUrl ?? ""));

  React.useEffect(() => {
    const next = describeVideo(videoUrl).kind === "uploaded" ? "" : (videoUrl ?? "");
    saved.current = next;
    setUrl(next);
  }, [videoUrl]);

  // Lien externe : meme enregistrement automatique que le reste du profil.
  React.useEffect(() => {
    if (uploaded || url === saved.current) return;

    const timer = setTimeout(async () => {
      try {
        await api("/api/me/profile", {
          method: "PATCH",
          // Champ vide = retirer la video : le contrat accepte null.
          body: { videoUrl: url.trim() || null },
        });
        saved.current = url;
        setError("");
        router.refresh();
      } catch (caught) {
        setError(errorMessage(caught));
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [url, uploaded, router]);

  async function send(file: File) {
    // Refus cote client avant de pousser 100 Mo sur le reseau pour rien. Le
    // serveur applique les memes bornes, il reste seul juge.
    if (!ACCEPTED_VIDEO_MIME.includes(file.type)) {
      setError("Format non pris en charge. Acceptés : MP4, WebM, OGG, MOV.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Fichier trop volumineux (${formatBytes(file.size)}) : 100 Mo maximum.`);
      return;
    }

    setBusy("upload");
    setError("");
    try {
      await upload("/api/me/profile/video", file);
      router.refresh();
      toast(`Vidéo téléversée — ${formatBytes(file.size)}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove() {
    setBusy("delete");
    setError("");
    try {
      await api("/api/me/profile/video", { method: "DELETE" });
      router.refresh();
      toast("Vidéo retirée");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="mb-[5px] text-xs text-text/70">Vidéo de présentation</div>

      <div className="max-w-[420px]">
        <VideoFrame videoUrl={videoUrl} />
      </div>

      {/* Etat de la moderation. Le candidat doit savoir pourquoi sa video
          n'est pas visible : une video qui disparait sans explication est un
          contentieux qui commence (mesure Cabinet du 2026-09-02, point 2). */}
      {videoUrl ? (
        <div className="mt-3 max-w-[420px]">
          {videoStatus === "pending" ? (
            <div
              data-testid="video-status-pending"
              className="border border-accent bg-accent-100/60 px-3 py-2.5 text-[12.5px] leading-[1.55] text-accent-800"
            >
              <strong>En attente de validation.</strong> Votre vidéo a bien été enregistrée.
              Elle n&apos;est pas encore visible des recruteurs ni du public : l&apos;équipe du
              dispositif doit d&apos;abord la valider.
            </div>
          ) : null}

          {videoStatus === "rejected" ? (
            <div
              role="alert"
              data-testid="video-status-rejected"
              className="border border-accent-600 bg-accent-100 px-3 py-2.5 text-[12.5px] leading-[1.55] text-accent-800"
            >
              <strong>Vidéo refusée.</strong>
              {videoReviewReason ? (
                <> Motif : {videoReviewReason}</>
              ) : null}{" "}
              Vous pouvez en déposer une nouvelle : elle repassera en validation.
            </div>
          ) : null}

          {videoStatus === "approved" && !isMinor ? (
            <div
              data-testid="video-status-approved"
              className="border border-divider px-3 py-2.5 text-[12.5px] leading-[1.55] text-text/70"
            >
              <strong>Vidéo validée.</strong> Elle est visible sur votre profil public.
            </div>
          ) : null}

          {/* Parcours 16-18 ans : la video n'est pas publiee, quelle que soit
              la decision de moderation. */}
          {isMinor ? (
            <div
              data-testid="video-status-minor"
              className="mt-2 border border-divider px-3 py-2.5 text-[12.5px] leading-[1.55] text-text/70"
            >
              Vous avez moins de 18 ans : votre vidéo n&apos;est pas diffusée publiquement et
              votre profil n&apos;apparaît pas au catalogue. Vous restez accompagné par un
              référent du dispositif.
            </div>
          ) : null}
        </div>
      ) : null}

      {uploaded ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-text/55">
            Fichier téléversé, servi par l&apos;API.
          </span>
          <Button
            variant="secondary"
            className="h-8"
            disabled={busy !== null}
            onClick={() => fileInput.current?.click()}
          >
            {busy === "upload" ? "Téléversement…" : "Remplacer le fichier"}
          </Button>
          <Button variant="ghost" disabled={busy !== null} onClick={remove}>
            {busy === "delete" ? "Suppression…" : "Retirer la vidéo"}
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <Field label="Lien YouTube ou Vimeo" htmlFor="p-video">
            <Input
              id="p-video"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              className="h-8"
              disabled={busy !== null}
              onClick={() => fileInput.current?.click()}
            >
              {busy === "upload" ? "Téléversement…" : "Téléverser un fichier"}
            </Button>
            <span className="font-mono text-[10.5px] text-text/50">
              MP4, WebM, OGG, MOV — 100 Mo maximum
            </span>
          </div>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={VIDEO_ACCEPT}
        aria-label="Fichier vidéo de présentation"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void send(file);
        }}
      />

      {error ? (
        <div
          role="alert"
          className="mt-3 border border-accent-600 bg-accent-100 px-3 py-2 text-[13px] text-accent-800"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
