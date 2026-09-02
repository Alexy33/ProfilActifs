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
export function VideoField({ videoUrl }: { videoUrl: string | null }) {
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
