"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { CONTACT_STATUSES, type ContactStatus } from "@/lib/vocabulary";

/** Avancement d'un candidat dans le pipeline du recruteur. */
export function ContactStatusSelect({
  contactId,
  status,
  name,
}: {
  contactId: string;
  status: ContactStatus;
  name: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = React.useState<ContactStatus>(status);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => setValue(status), [status]);

  const change = async (next: ContactStatus) => {
    const previous = value;
    setValue(next);
    setPending(true);

    try {
      await api(`/api/me/contacts/${contactId}`, { method: "PATCH", body: { status: next } });
      router.refresh();
      toast(`${name} — ${next}`);
    } catch (error) {
      setValue(previous);
      toast(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <Select
      aria-label={`Statut de ${name}`}
      className="min-h-[30px] text-[12.5px]"
      value={value}
      disabled={pending}
      onChange={(event) => change(event.target.value as ContactStatus)}
    >
      {CONTACT_STATUSES.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}
