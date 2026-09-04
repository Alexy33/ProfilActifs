import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "CGU — ProfilsActifs",
  description: "Conditions Générales d'Utilisation de ProfilsActifs",
};

export default function CGUPage() {
  return (
    <main className="min-h-screen bg-[#ebf0f7] text-[#2d3748]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#ebf0f7]/80 backdrop-blur-md border-b border-[#2d3748]/10">
        <div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-6 md:px-10">
          <Link
            href="/"
            className="flex items-center gap-2 transition-transform hover:translate-x-0.5"
          >
            <ArrowLeft className="size-5" />
            <span className="font-semibold">Retour</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <article className="mx-auto max-w-4xl px-6 py-16 md:px-10">
        <div className="prose prose-sm max-w-none text-[#2d3748]">
          <h1 className="text-4xl font-bold tracking-tight text-[#1B3A6B]">
            Conditions Générales d'Utilisation
          </h1>
          <p className="mt-2 text-lg text-[#718096]">
            ProfilsActifs — Ministère du Job et Bonheur
          </p>
          <hr className="my-8 border-[#2d3748]/10" />

          <p>
            Les présentes Conditions Générales d'Utilisation, ci-après « CGU », encadrent
            l'accès et l'utilisation de la plateforme <strong>ProfilsActifs</strong>.
          </p>

          <p>
            La publication de ces CGU est conditionnée à leur validation préalable par le
            service juridique compétent.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">1. Objet</h2>
          <p>ProfilsActifs est une plateforme permettant notamment :</p>
          <ul className="ml-6 space-y-1">
            <li>la création et la gestion de profils candidats ;</li>
            <li>la consultation de profils par des recruteurs autorisés ;</li>
            <li>le passage d'un questionnaire de certification ;</li>
            <li>la gestion de données liées aux certifications ;</li>
            <li>l'ajout de vidéos de présentation ;</li>
            <li>l'utilisation de fonctions d'administration de la plateforme.</li>
          </ul>
          <p>Les présentes CGU définissent les règles applicables à l'utilisation de ces fonctionnalités.</p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">2. Acceptation des CGU</h2>
          <p>
            L'utilisation des fonctionnalités nécessitant un compte est conditionnée à
            l'acceptation des présentes CGU.
          </p>
          <p>Lors de l'acceptation, ProfilsActifs doit enregistrer au minimum :</p>
          <ul className="ml-6 space-y-1">
            <li>l'identifiant de l'utilisateur ;</li>
            <li>la date et l'heure du consentement ;</li>
            <li>la version des CGU acceptée.</li>
          </ul>
          <p>
            La version indiquée en tête du présent document constitue la référence utilisée
            pour ce consentement.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">3. Création et utilisation d'un compte</h2>
          <p>
            L'utilisateur s'engage à fournir des informations exactes et à maintenir les
            informations de son compte à jour.
          </p>
          <p>
            Il est responsable de la confidentialité de ses moyens d'authentification et ne
            doit pas permettre à un tiers d'utiliser son compte.
          </p>
          <p>
            Toute utilisation manifestement frauduleuse ou contraire aux présentes CGU peut
            conduire à une restriction ou à une suspension de l'accès au service.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">4. Utilisation des profils</h2>
          <p>
            Les candidats peuvent renseigner des informations destinées à présenter leur
            parcours, leurs compétences et, le cas échéant, leurs résultats de certification.
          </p>
          <p>
            Les recruteurs ne doivent utiliser les informations disponibles sur ProfilsActifs
            que dans le cadre des finalités prévues par la plateforme, notamment la
            consultation et l'évaluation de profils professionnels.
          </p>
          <p>Toute utilisation des données à des fins étrangères au fonctionnement prévu de ProfilsActifs est interdite.</p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">5. Certification</h2>
          <p>
            Les questionnaires de certification sont proposés dans le but d'évaluer certaines
            compétences déclarées ou attendues.
          </p>
          <p>
            Les résultats affichés ou enregistrés par la plateforme ne constituent pas à eux
            seuls une garantie absolue du niveau professionnel d'un utilisateur.
          </p>
          <p>
            Chaque tentative est associée à une version déterminée du questionnaire afin de
            garantir la cohérence entre les questions présentées, les réponses enregistrées et
            le calcul du résultat.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">6. Contenus publiés par les utilisateurs</h2>
          <p>
            Les utilisateurs restent responsables des contenus qu'ils ajoutent à la plateforme,
            notamment :
          </p>
          <ul className="ml-6 space-y-1">
            <li>les informations de profil ;</li>
            <li>les descriptions ;</li>
            <li>les liens ;</li>
            <li>les vidéos ;</li>
            <li>les autres contenus éventuellement téléversés.</li>
          </ul>
          <p>Ils s'engagent à ne pas publier de contenu :</p>
          <ul className="ml-6 space-y-1">
            <li>illicite ;</li>
            <li>frauduleux ;</li>
            <li>diffamatoire ;</li>
            <li>portant atteinte aux droits d'un tiers ;</li>
            <li>contenant des données qu'ils ne sont pas autorisés à communiquer ;</li>
            <li>présentant un risque pour la sécurité de la plateforme.</li>
          </ul>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">7. Vidéos et services tiers</h2>
          <p>
            ProfilsActifs permet de téléverser directement certaines vidéos sur son
            infrastructure.
          </p>
          <p>
            Certains profils, notamment des profils utilisés pour la démonstration, peuvent
            également contenir des liens vers des services externes tels que YouTube ou Vimeo.
          </p>
          <p>
            Lorsqu'un contenu externe est consulté, le navigateur de l'utilisateur peut
            communiquer directement avec le fournisseur concerné.
          </p>
          <p>
            Ces services disposent de leurs propres conditions d'utilisation et règles
            relatives à la protection des données.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">8. Données personnelles</h2>
          <p>
            Les données personnelles traitées dans le cadre de ProfilsActifs doivent être
            utilisées uniquement pour les finalités définies par le service.
          </p>
          <p>
            Les traitements de données, leurs finalités, les catégories de données concernées,
            leurs destinataires et leurs durées de conservation doivent être décrits dans le
            registre des traitements correspondant.
          </p>
          <p>
            Sauf obligation légale ou nécessité dûment justifiée contraire, les données
            personnelles sont conservées pendant une durée maximale de dix ans à compter de la
            dernière interaction de l'utilisateur avec la plateforme, puis supprimées ou
            anonymisées selon les procédures applicables.
          </p>
          <p>
            Les CGU doivent être rédigées et maintenues de manière cohérente avec ce registre.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">9. Sécurité</h2>
          <p>L'utilisateur s'engage à ne pas tenter :</p>
          <ul className="ml-6 space-y-1">
            <li>de contourner les mécanismes d'authentification ;</li>
            <li>d'accéder aux données d'un autre utilisateur sans autorisation ;</li>
            <li>de perturber le fonctionnement de la plateforme ;</li>
            <li>d'exploiter volontairement une vulnérabilité ;</li>
            <li>d'introduire du code ou des données malveillantes.</li>
          </ul>
          <p>
            Toute anomalie de sécurité constatée doit être signalée par les canaux définis par
            l'organisation exploitant ProfilsActifs.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">10. Disponibilité du service</h2>
          <p>ProfilsActifs peut être temporairement indisponible, notamment en cas :</p>
          <ul className="ml-6 space-y-1">
            <li>de maintenance ;</li>
            <li>de mise à jour ;</li>
            <li>d'incident technique ;</li>
            <li>d'intervention de sécurité.</li>
          </ul>
          <p>Aucune disponibilité permanente ne peut être garantie dans le cadre du démonstrateur.</p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">11. Suspension ou suppression d'un accès</h2>
          <p>
            Un compte peut être suspendu ou supprimé lorsqu'un utilisateur :
          </p>
          <ul className="ml-6 space-y-1">
            <li>ne respecte pas les présentes CGU ;</li>
            <li>compromet la sécurité de la plateforme ;</li>
            <li>utilise le service de manière frauduleuse ;</li>
            <li>utilise des données en dehors des finalités autorisées.</li>
          </ul>
          <p>Toute mesure prise doit respecter les règles et procédures applicables au service.</p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">12. Évolution des CGU</h2>
          <p>
            Les présentes CGU peuvent évoluer afin de tenir compte des modifications
            fonctionnelles de ProfilsActifs, des changements dans les traitements de données
            et des évolutions réglementaires.
          </p>
          <p>
            Chaque version publiée doit disposer d'un identifiant de version distinct. La
            version acceptée par chaque utilisateur doit être conservée afin de pouvoir
            déterminer quelles CGU étaient applicables au moment du consentement.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">13. Version et traçabilité</h2>
          <div className="rounded-lg bg-[#f7fafc] p-4 font-mono text-sm">
            <p><strong>Version du document :</strong> 1.0</p>
            <p><strong>Date de rédaction :</strong> [À compléter]</p>
            <p><strong>Date de validation juridique :</strong> [À compléter après validation]</p>
            <p><strong>Date de publication :</strong> [À compléter]</p>
          </div>
          <p className="mt-4">
            La version <code className="rounded bg-[#f7fafc] px-2 py-1">1.0</code> ne doit pas être
            considérée comme publiée tant que la validation juridique n'a pas été obtenue.
          </p>

          <h2 className="mt-8 text-2xl font-bold text-[#1B3A6B]">14. Validation juridique</h2>
          <p>
            Avant leur mise à disposition des utilisateurs, les présentes CGU doivent être
            transmises au service juridique compétent.
          </p>
          <p>
            Les éventuelles remarques ou demandes de modification du service juridique doivent
            être intégrées avant la publication de la version définitive.
          </p>

          <hr className="my-8 border-[#2d3748]/10" />

          <p className="rounded-lg bg-[#fef3c7] p-4 text-[#78350f]">
            <strong>⚠️ Statut :</strong> Ce document est un brouillon en attente de validation
            juridique. Il ne s'agit pas de conditions applicables en l'état.
          </p>

          <div className="mt-12 flex gap-4">
            <Button
              asChild
              className="rounded-2xl bg-[#1B3A6B] text-white hover:bg-[#273D4F]"
            >
              <Link href="/">Retour à l'accueil</Link>
            </Button>
          </div>
        </div>
      </article>
    </main>
  );
}
