"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const SUGGESTED =
  "Bonjour, votre présentation a retenu notre attention. Seriez-vous disponible pour un premier échange cette semaine ?";

/**
 * Prise de contact d'un recruteur.
 *
 * L'envoi passe par `POST /api/profiles/{id}/contact`, qui cree la ligne de
 * suivi ET la notification du candidat : rien n'est a orchestrer ici.
 */
export function ContactDialog({ profileId, name }: { profileId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState(SUGGESTED);
  const [error, setError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const send = async () => {
    setPending(true);
    setError("");

    try {
      await api(`/api/profiles/${profileId}/contact`, { method: "POST", body: { message } });
      setOpen(false);
      router.refresh();
      toast(`Message envoyé à ${name}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button variant="primary" className="h-10 w-full" onClick={() => setOpen(true)}>
        Prendre contact
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Prendre contact"
        actions={
          <>
            <Button variant="secondary" className="h-9" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" className="h-9" onClick={send} disabled={pending}>
              {pending ? "Envoi…" : "Envoyer"}
            </Button>
          </>
        }
      >
        <div className="text-sm text-text/85">
          Votre message sera transmis à {name} et déclenchera une notification sur son espace.
        </div>
        <Field label="Message" htmlFor="contact-message">
          <Textarea
            id="contact-message"
            className="min-h-[110px]"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </Field>
        {error ? (
          <div role="alert" className="border border-accent-600 bg-accent-100 px-3 py-2 text-[13px] text-accent-800">
            {error}
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
