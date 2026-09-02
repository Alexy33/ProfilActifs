"use client";

import * as React from "react";
import { api } from "@/lib/api-client";
import { Blueprint } from "@/components/ui/blueprint";
import { formatDateTime } from "@/lib/format";
import type { NotificationRow } from "@/server/services/dashboard";

/**
 * Notifications du demandeur.
 *
 * Les ouvrir vaut lecture : le badge de l'en-tete retombe des la visite de
 * l'espace, comme dans la maquette. L'appel est lance une fois, sans bloquer
 * l'affichage — un echec reseau laisse simplement le badge en place.
 */
export function NotificationsCard({ items, unread }: { items: NotificationRow[]; unread: number }) {
  const marked = React.useRef(false);

  React.useEffect(() => {
    if (unread === 0 || marked.current) return;
    marked.current = true;
    void api("/api/me/notifications/read", { method: "POST" }).catch(() => {
      marked.current = false;
    });
  }, [unread]);

  return (
    <Blueprint id="notifications" className="scroll-mt-24 p-6">
      <div className="font-heading text-2xl uppercase">Notifications</div>

      {items.length > 0 ? (
        <div className="mt-4 flex flex-col gap-px bg-divider">
          {items.map((item) => (
            <div key={item.id} className="bg-bg px-0.5 py-3">
              <div className="text-sm leading-[1.45]">{item.text}</div>
              <div className="mt-[3px] font-mono text-[10.5px] text-text/50">
                {formatDateTime(item.createdAt)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3.5 text-sm text-text/55">Aucune interaction reçue pour le moment.</div>
      )}
    </Blueprint>
  );
}
