import Link from "next/link";
import { Blueprint } from "@/components/ui/blueprint";
import { Button } from "@/components/ui/button";
import { DataTable, Td, Th, Tr } from "@/components/ui/data-table";
import { StatGrid } from "@/components/ui/stat-grid";
import { requireRole } from "@/lib/session";
import { listContacts, listFavorites, recruiterStats } from "@/server/services/dashboard";
import { ContactStatusSelect } from "@/components/recruteur/contact-status-select";
import { FavoritesList } from "@/components/recruteur/favorites-list";

export const dynamic = "force-dynamic";

/** Espace recruteur : suivi des prises de contact et favoris. */
export default async function MesCandidatsPage() {
  const session = await requireRole("recruiter");

  const [stats, contacts, favorites] = await Promise.all([
    recruiterStats(session.user.id),
    listContacts(session.user.id),
    listFavorites(session.user.id),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-divider pb-5">
        <div>
          <div className="font-mono text-[11px] tracking-[0.16em] text-accent-700 uppercase">
            Espace recruteur
          </div>
          <h1 className="mt-2.5 text-[42px] leading-none uppercase">Suivi des candidats</h1>
        </div>
        <Button asChild variant="primary" className="h-9">
          <Link href="/catalogue">Parcourir le catalogue</Link>
        </Button>
      </div>

      <StatGrid
        className="mt-7"
        columns={3}
        stats={[
          { value: stats.contacted, label: "candidats contactés" },
          { value: stats.favorites, label: "profils en favoris" },
          { value: stats.interviewsPlanned, label: "entretiens planifiés" },
        ]}
      />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Blueprint className="p-6">
          <div className="font-heading text-2xl uppercase">Candidats contactés</div>

          {contacts.length > 0 ? (
            <DataTable className="mt-4">
              <thead>
                <tr>
                  <Th>Candidat</Th>
                  <Th>Secteur</Th>
                  <Th>Certif.</Th>
                  <Th>Statut</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {contacts.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <div className="font-medium">{row.profile.name}</div>
                      <div className="text-[11.5px] text-text/55">{row.profile.title}</div>
                    </Td>
                    <Td>{row.profile.sector}</Td>
                    <Td>{row.profile.certified ? `✓ ${row.profile.score}` : "—"}</Td>
                    <Td>
                      <ContactStatusSelect
                        contactId={row.id}
                        status={row.status}
                        name={row.profile.name}
                      />
                    </Td>
                    <Td>
                      <Button asChild variant="ghost">
                        <Link href={`/profils/${row.profile.id}`}>Ouvrir</Link>
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <div className="py-[30px] text-sm text-text/55">
              Aucun candidat contacté. Ouvrez un profil depuis le catalogue pour lancer une prise de
              contact.
            </div>
          )}
        </Blueprint>

        <Blueprint className="p-6">
          <div className="font-heading text-2xl uppercase">Favoris</div>
          <FavoritesList items={favorites} />
        </Blueprint>
      </div>
    </div>
  );
}
