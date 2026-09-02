import Link from "next/link";
import { Blueprint } from "@/components/ui/blueprint";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { STACK } from "@/lib/stack";
import { publicStats } from "@/server/services/dashboard";
import { DemoAccounts } from "@/components/home/demo-accounts";

// Les compteurs sont lus a chaque requete : ils bougent des qu'un profil est
// publie ou qu'un recruteur prend contact.
export const dynamic = "force-dynamic";

const ROLE_CARDS = [
  {
    num: "01",
    title: "Demandeur d'emploi",
    body: "Un profil, une vidéo de 60 secondes, et le questionnaire de certification qui transforme vos aptitudes en badge officiel.",
    cta: "Créer mon profil",
    href: "/connexion?mode=inscription",
  },
  {
    num: "02",
    title: "Recruteur",
    body: "Le catalogue complet, filtrable par compétence, secteur, localisation et statut de certification. Contact direct, favoris, suivi.",
    cta: "Ouvrir le catalogue",
    href: "/catalogue",
  },
  {
    num: "03",
    title: "Administration",
    body: "Modération des profils et des vidéos, gestion des questions et des pondérations, tableau de bord global du dispositif.",
    cta: "Accéder à l'admin",
    href: "/administration",
  },
] as const;

export default async function HomePage() {
  const stats = await publicStats();

  const counters = [
    { value: stats.publishedProfiles, label: "profils publiés" },
    { value: `${stats.certificationRate}%`, label: "taux de certification" },
    { value: stats.questionCount, label: "questions de certification" },
    { value: stats.recruiterContacts, label: "contacts recruteurs" },
  ];

  return (
    <div>
      <section className="grid items-start gap-14 border-b border-divider pb-12 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div className="font-mono text-[11px] tracking-[0.16em] text-accent-700 uppercase">
            Ministère du Job et Bonheur · JEB/DNI/2026-003
          </div>
          <h1 className="mt-[18px] text-[clamp(42px,7vw,66px)] leading-[0.96] tracking-[-0.01em] uppercase">
            La compétence
            <br />
            se voit,
            <br />
            se certifie.
          </h1>
          <p className="mt-[22px] max-w-[46ch] text-[16.5px] leading-[1.55] text-pretty text-text/78">
            ProfilsActifs remplace le CV figé par une présentation vidéo courte et un badge de
            certification officiel des aptitudes professionnelles. Un outil de mise en relation, pas
            un réseau social.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-3">
            <Button asChild variant="primary" marks className="h-11 px-[22px] text-[15px]">
              <Link href="/connexion?mode=inscription">Créer mon profil</Link>
            </Button>
            <Button asChild variant="secondary" className="h-11 px-[22px] text-[15px]">
              <Link href="/catalogue">Consulter les profils</Link>
            </Button>
          </div>
        </div>

        <Blueprint className="px-7 py-[26px]">
          <div className="font-mono text-[10px] tracking-[0.14em] text-text/55 uppercase">
            Fiche technique — démonstrateur
          </div>
          <div className="mt-5 grid grid-cols-2 gap-px bg-divider">
            {counters.map((counter) => (
              <div key={counter.label} className="bg-bg px-3.5 py-4">
                <div className="font-heading text-[34px] leading-none">{counter.value}</div>
                <div className="mt-1 text-xs text-text/60">{counter.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-[22px] flex flex-wrap gap-1.5">
            {STACK.map((item) => (
              <Tag key={item} variant="outline" className="font-mono text-[10.5px]">
                {item}
              </Tag>
            ))}
          </div>
        </Blueprint>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {ROLE_CARDS.map((card) => (
          <Blueprint key={card.num} className="flex flex-col gap-2 p-6">
            <div className="font-mono text-[10px] tracking-[0.1em] text-accent uppercase">
              {card.num}
            </div>
            <div className="font-heading text-[22px] leading-tight uppercase">{card.title}</div>
            <p className="flex-1 text-sm leading-[1.55] text-text/80">{card.body}</p>
            <Button asChild variant="ghost" className="mt-1.5 self-start">
              <Link href={card.href}>{card.cta} →</Link>
            </Button>
          </Blueprint>
        ))}
      </section>

      <DemoAccounts />
    </div>
  );
}
