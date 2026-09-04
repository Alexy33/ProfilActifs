import Link from "next/link";
import { LuUserRound } from "react-icons/lu";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  FileVideo,
  Search,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LandingSessionActions } from "@/components/layout/landing-session-actions";
import { BlocMarque } from "@/components/layout/bloc-marque";
import { DemoAccountCard } from "@/components/auth/demo-account-card";
import { getCurrentSession } from "@/lib/auth-session";

const features = [
  {
    icon: FileVideo,
    number: "01",
    title: "Présentez-vous autrement",
    description:
      "Ajoutez une courte présentation vidéo pour montrer votre personnalité et votre manière de communiquer.",
  },
  {
    icon: BadgeCheck,
    number: "02",
    title: "Certifiez vos compétences",
    description:
      "Complétez le parcours de certification et obtenez un badge professionnel visible par les recruteurs.",
  },
  {
    icon: Search,
    number: "03",
    title: "Soyez découvert",
    description:
      "Votre profil peut être consulté par des recruteurs à la recherche de compétences correspondant à leurs besoins.",
  },
];

const profileModules = [
  {
    icon: LuUserRound,
    title: "Identité professionnelle",
    description: "Parcours, métier et savoir-faire",
  },
  {
    icon: FileVideo,
    title: "Présentation vidéo",
    description: "Une introduction courte et personnelle",
  },
  {
    icon: BadgeCheck,
    title: "Compétences certifiées",
    description: "Des aptitudes vérifiées et visibles",
  },
  {
    icon: Search,
    title: "Visibilité recruteurs",
    description: "Un profil consultable selon leurs besoins",
  },
];

const demoAccounts = [
  { role: "Demandeur", email: "amina@exemple.fr", color: "bg-[#D1DEF0] text-[#1B2D3E]" },
  { role: "Recruteur", email: "recruteur@exemple.fr", color: "bg-[#dff7e9] text-[#17603a]" },
  { role: "Administration", email: "admin@jeb.gouv.fr", color: "bg-[#eee7ff] text-[#65449b]" },
];

export default async function HomePage() {
  const session = await getCurrentSession();

  return (
    <main className="min-h-screen bg-[#ebf0f7] text-[#22334D] selection:bg-[#1B3A6B] selection:text-white antialiased">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-[#ebf0f7]/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 md:px-10">
          {/* Bloc-marque de l'Etat, en haut a gauche (charte R.10). La landing
              n'utilise pas SiteShell : elle porte donc le bloc elle-meme. */}
          <BlocMarque />

          <nav className="hidden items-center gap-2 rounded-full bg-[#ebf0f7] p-2 shadow-[inset_3px_3px_6px_#c5d1e0,inset_-3px_-3px_6px_#ffffff] md:flex">
            <Link
              href="#concept"
              className="rounded-full px-5 py-2 text-sm font-semibold text-[#41556E] transition-all hover:text-[#273D4F]"
            >
              Le concept
            </Link>
            <Link
              href="#fonctionnement"
              className="rounded-full px-5 py-2 text-sm font-semibold text-[#41556E] transition-all hover:text-[#273D4F]"
            >
              Fonctionnement
            </Link>
            <Link
              href="#recruteurs"
              className="rounded-full px-5 py-2 text-sm font-semibold text-[#41556E] transition-all hover:text-[#273D4F]"
            >
              Recruteurs
            </Link>
          </nav>

          <LandingSessionActions connected={Boolean(session?.user)} />
        </div>
      </header>

      {/* Hero */}
      <section id="concept" className="py-12 md:py-20">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 md:px-10 lg:grid-cols-2 lg:items-center lg:gap-24 xl:gap-40">
          <div className="flex flex-col justify-center">

            <h1 className="text-4xl font-extrabold uppercase leading-tight tracking-tight text-[#22334D] sm:text-6xl lg:text-7xl">
              La compétence
              <br />
              se voit,
              <br />
              <span className="text-[#1B3A6B]"> se certifie.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[#41556E] md:text-lg">
              ProfilsActifs transforme le CV traditionnel en une présentation
              professionnelle plus vivante : compétences, vidéo et
              certification réunies dans un profil clair et accessible aux
              recruteurs.
            </p>

            <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-wider text-[#41556E]">
              Un outil de mise en relation professionnelle, pas un réseau social.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="group h-14 rounded-2xl bg-[#2d3748] px-8 text-base font-semibold text-white shadow-[8px_8px_16px_#c5d1e0,-8px_-8px_16px_#ffffff] transition-all hover:bg-[#1E293B] active:scale-[0.97]"
              >
                <Link href="/register">
                  Créer mon profil
                  <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-14 rounded-2xl bg-[#ebf0f7] px-8 text-base font-semibold text-[#22334D] shadow-[8px_8px_16px_#c5d1e0,-8px_-8px_16px_#ffffff] hover:bg-[#ebf0f7] hover:shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] active:scale-[0.97]"
              >
                <Link href="/catalogue">Consulter les profils</Link>
              </Button>
            </div>
          </div>

          {/* Technical card / Overview Card */}
          <div className="flex items-center justify-center">
            <div className="w-full rounded-3xl border border-[#273D4F]/15 bg-white p-8 md:p-10">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[#1B3A6B]/12 pb-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#1B3A6B] text-white">
                    <LuUserRound aria-hidden="true" className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#22334D]">
                      Votre profil, en un coup d’œil
                    </h2>
                    <p className="mt-1 text-sm text-[#41556E]">
                      Tout ce qui aide un recruteur à vous comprendre
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile modules */}
              <div className="mt-6 space-y-3">
                {profileModules.map((profileModule) => {
                  const Icon = profileModule.icon;

                  return (
                    <div
                      key={profileModule.title}
                      className="group flex items-center gap-4 rounded-2xl bg-[#ebf0f7] p-4 transition-colors hover:bg-[#1B3A6B]/15"
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1B3A6B]">
                        <Icon aria-hidden="true" className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-[#22334D]">
                          {profileModule.title}
                        </h3>
                        <p className="mt-1 text-sm leading-snug text-[#41556E]">
                          {profileModule.description}
                        </p>
                      </div>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1B3A6B] text-white">
                        <Check aria-hidden="true" className="size-3.5 stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-6 border-t border-[#1B3A6B]/12 pt-5 text-base leading-relaxed text-[#41556E]">
                Un profil unique pour présenter vos compétences aux recruteurs
                et faire reconnaître vos aptitudes par des certificateurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="fonctionnement" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          {/* Header */}
          <div className="mx-auto max-w-3xl text-center">

            <h2 className="mt-5 text-3xl font-bold uppercase tracking-tight text-[#22334D] md:text-5xl">
              Votre profil en
              <span className="text-[#1B3A6B]"> 3 étapes.</span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#41556E]">
              Créez votre profil, valorisez vos compétences et rendez-vous visible
              auprès des recruteurs.
            </p>
          </div>

          {/* Steps */}
          <div className="relative mt-16 grid gap-8 md:grid-cols-3 md:gap-12 lg:gap-16">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <div key={feature.number} className="relative">
                  <article className="group relative h-full overflow-hidden rounded-3xl border border-[#1B3A6B]/15 bg-white/55 p-7 transition-all duration-500 hover:-translate-y-2 hover:border-[#1B3A6B]/35 hover:bg-white">
                    {/* Animated top line */}
                    <div className="absolute left-0 top-0 h-1 w-0 bg-[#1B3A6B] transition-all duration-500 group-hover:w-full" />

                    {/* Number */}
                    <span className="absolute right-6 top-6 font-mono text-4xl font-bold text-accent-500/45 transition-all duration-500 group-hover:text-accent-500/75">
                      {feature.number}
                    </span>

                    {/* Icon */}
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#1B3A6B]/10 text-[#1B3A6B] transition-all duration-500 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-[#1B3A6B] group-hover:text-white">
                      <Icon className="size-6 stroke-[1.7]" />
                    </div>

                    {/* Content */}
                    <div className="mt-10">
                      <h3 className="text-xl font-bold uppercase tracking-tight text-[#22334D]">
                        {feature.title}
                      </h3>

                      <p className="mt-3 text-sm leading-relaxed text-[#41556E]">
                        {feature.description}
                      </p>
                    </div>

                    {/* Bottom indicator */}
                    <div className="mt-8 flex items-center gap-3">
                      <div className="size-1.5 rounded-full bg-[#1B3A6B]" />

                      <div className="h-px flex-1 overflow-hidden bg-[#1B3A6B]/15">
                        <div className="h-full w-0 bg-[#1B3A6B] transition-all duration-700 group-hover:w-full" />
                      </div>
                    </div>
                  </article>

                  {/* Desktop connector */}
                  {index < features.length - 1 && (
                    <div className="absolute -right-12 top-1/2 z-10 hidden -translate-y-1/2 md:flex lg:-right-14">
                      <div className="group/arrow flex size-12 items-center justify-center rounded-full border border-[#1B3A6B]/20 bg-[#ebf0f7] text-[#1B3A6B]">
                        <ArrowRight className="size-5 animate-[pulse_2s_ease-in-out_infinite] transition-transform duration-300 group-hover/arrow:translate-x-1" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Flow indicator */}
          <div className="mt-12 hidden items-center justify-center gap-3 md:flex">
            {features.map((feature, index) => (
              <div key={feature.number} className="flex items-center gap-3">
                <span className="size-2 rounded-full bg-[#1B3A6B]" />

                {index < features.length - 1 && (
                  <div className="h-px w-16 bg-gradient-to-r from-[#1B3A6B] to-[#1B3A6B]/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recruiter section */}
      <section id="recruteurs" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="overflow-hidden rounded-[2rem] border border-[#1B3A6B]/15 bg-white/55">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              {/* Left */}
              <div className="relative flex flex-col justify-center p-8 md:p-12 lg:p-14">
                <h2 className="mt-6 max-w-xl text-3xl font-bold uppercase leading-tight tracking-tight text-[#22334D] md:text-5xl">
                  Trouvez les bons profils
                  <span className="text-[#1B3A6B]"> plus rapidement.</span>
                </h2>

                <p className="mt-6 max-w-xl text-base leading-relaxed text-[#41556E]">
                  Recherchez des candidats selon leurs compétences, leur secteur et
                  leur localisation, puis consultez directement les profils qui
                  correspondent à vos besoins.
                </p>

                <div className="mt-8">
                  <Button
                    asChild
                    className="group h-12 rounded-2xl bg-[#2d3748] px-6 font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#1E293B]"
                  >
                    <Link href="/catalogue">
                      Parcourir le catalogue
                      <ArrowRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right */}
              <div className="grid border-t border-[#1B3A6B]/10 sm:grid-cols-2 lg:border-l lg:border-t-0">
                {/* Search card */}
                <div className="group relative overflow-hidden border-b border-[#1B3A6B]/10 p-8 transition-all duration-500 hover:bg-[#1B3A6B]/5 sm:border-b-0 sm:border-r">
                  <div className="absolute right-6 top-6 font-mono text-5xl font-bold text-accent-500/45 transition-all duration-500 group-hover:text-accent-500/75">
                    01
                  </div>

                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#1B3A6B]/10 text-[#1B3A6B] transition-all duration-500 group-hover:-rotate-3 group-hover:scale-110 group-hover:bg-[#1B3A6B] group-hover:text-white">
                    <BriefcaseBusiness className="size-6 stroke-[1.6]" />
                  </div>

                  <h3 className="mt-10 text-xl font-bold uppercase tracking-tight text-[#22334D]">
                    Recherche ciblée
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-[#41556E]">
                    Filtrez les profils par secteur, localisation et compétences pour
                    aller directement aux candidats les plus pertinents.
                  </p>

                  <div className="mt-8 h-px overflow-hidden bg-[#1B3A6B]/15">
                    <div className="h-full w-0 bg-[#1B3A6B] transition-all duration-700 group-hover:w-full" />
                  </div>
                </div>

                {/* Certified profiles card */}
                <div className="group relative overflow-hidden p-8 transition-all duration-500 hover:bg-[#1B3A6B]/5">
                  <div className="absolute right-6 top-6 font-mono text-5xl font-bold text-accent-500/45 transition-all duration-500 group-hover:text-accent-500/75">
                    02
                  </div>

                  <div className="flex size-14 items-center justify-center rounded-2xl bg-[#1B3A6B]/10 text-[#1B3A6B] transition-all duration-500 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-[#1B3A6B] group-hover:text-white">
                    <ShieldCheck className="size-6 stroke-[1.6]" />
                  </div>

                  <h3 className="mt-10 text-xl font-bold uppercase tracking-tight text-[#22334D]">
                    Profils certifiés
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-[#41556E]">
                    Identifiez rapidement les candidats ayant validé leur
                    certification et consultez leurs aptitudes professionnelles.
                  </p>

                  <div className="mt-8 h-px overflow-hidden bg-[#1B3A6B]/15">
                    <div className="h-full w-0 bg-[#1B3A6B] transition-all duration-700 group-hover:w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom flow */}
            <div className="border-t border-[#1B3A6B]/10 px-8 py-5 md:px-12">
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wider text-[#41556E]">
                <span className="transition-colors hover:text-[#1B3A6B]">
                  Rechercher
                </span>
                <ArrowRight className="size-4 text-[#1B3A6B]/50" />
                <span className="transition-colors hover:text-[#1B3A6B]">
                  Comparer
                </span>
                <ArrowRight className="size-4 text-[#1B3A6B]/50" />
                <span className="transition-colors hover:text-[#1B3A6B]">
                  Consulter
                </span>
                <ArrowRight className="size-4 text-[#1B3A6B]/50" />
                <span className="text-[#1B3A6B]">Contacter</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comptes de demonstration */}
      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="rounded-[2rem] bg-[#ebf0f7] p-7 shadow-[10px_10px_20px_#c5d1e0,-10px_-10px_20px_#ffffff] md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-[#22334D]">
                  Comptes de <span className="text-[#1B3A6B]">démonstration.</span>
                </h2>
                <p className="mt-2 text-sm text-[#41556E]">
                  Utilisez ces accès pour découvrir chaque espace de la plateforme.
                </p>
              </div>
              <p className="rounded-full bg-white px-4 py-2 font-mono text-xs font-semibold text-[#41556E]">
                Mot de passe : demo1234
              </p>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {demoAccounts.map((account) => (
                <DemoAccountCard
                  key={account.role}
                  role={account.role}
                  email={account.email}
                  color={account.color}
                  destination={account.role === "Demandeur" ? "/candidate" : account.role === "Recruteur" ? "/recruiter" : "/admin"}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 pt-6 md:pb-28 md:pt-10">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="p-8 md:p-12 lg:p-14">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
              <div>

                <h2 className="mt-6 max-w-3xl text-3xl font-bold uppercase leading-tight tracking-tight text-[#22334D] md:text-5xl">
                  Montrez ce que votre CV
                  <span className="text-[#1B3A6B]"> ne peut pas montrer.</span>
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#41556E]">
                  Créez votre profil, mettez en avant vos compétences et commencez
                  votre parcours de certification.
                </p>

                {/* Mini flow */}
                <div className="mt-8 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wider text-[#41556E]">
                  <span className="transition-colors duration-300 hover:text-[#1B3A6B]">
                    Créer
                  </span>
                  <ArrowRight className="size-4 text-[#1B3A6B]/50" />
                  <span className="transition-colors duration-300 hover:text-[#1B3A6B]">
                    Compléter
                  </span>
                  <ArrowRight className="size-4 text-[#1B3A6B]/50" />
                  <span className="transition-colors duration-300 hover:text-[#1B3A6B]">
                    Certifier
                  </span>
                  <ArrowRight className="size-4 text-[#1B3A6B]/50" />
                  <span className="text-[#1B3A6B]">Être visible</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button
                  asChild
                  size="lg"
                  className="group/button h-14 rounded-2xl bg-[#2d3748] px-8 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#1E293B]"
                >
                  <Link href="/register">
                    Commencer
                    <ArrowRight className="ml-2 size-5 transition-transform duration-300 group-hover/button:translate-x-1.5" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="ghost"
                  className="h-14 rounded-2xl border border-[#1B3A6B]/15 bg-transparent px-8 text-base font-semibold text-[#22334D] transition-all duration-300 hover:-translate-y-1 hover:bg-[#1B3A6B]/5"
                >
                  <Link href="/login">Se connecter</Link>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2d3748]/10 bg-white py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="text-center md:text-left">
              <p className="font-semibold text-[#2d3748]">ProfilsActifs</p>
              <p className="text-sm text-[#718096]">
                Ministère du Job et Bonheur (JEB/DNI/2026-003)
              </p>
            </div>
            <nav className="flex gap-6 text-sm">
              <Link
                href="/cgu"
                className="text-[#4a5568] transition-colors hover:text-[#1B3A6B] hover:underline"
              >
                Conditions d'utilisation
              </Link>
              <a
                href="/api/docs"
                className="text-[#4a5568] transition-colors hover:text-[#1B3A6B] hover:underline"
              >
                Documentation API
              </a>
            </nav>
          </div>
          <div className="mt-6 border-t border-[#2d3748]/10 pt-6 text-center text-xs text-[#718096]">
            <p>Démonstrateur — ProfilsActifs</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
