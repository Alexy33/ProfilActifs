"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Briefcase, Building2, Loader2, UserRound } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { MAJORITY_AGE, MINIMUM_AGE, ageOn, latestAllowedBirthDate } from "@/lib/age";
import { isValidSiren, normalizeSiren } from "@/lib/siren";
import { SECTORS, type Sector } from "@/lib/vocabulary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Les deux roles ouverts a l'inscription publique. `admin` se cree en base. */
type Role = "candidate" | "recruiter";

const fieldClass =
  "h-11 rounded-xl border-0 bg-[#ebf0f7] px-3.5 text-base shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] placeholder:text-[#566274] focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-[#1B3A6B]/30 md:text-base";

const ROLES: { id: Role; label: string; hint: string; icon: typeof UserRound }[] = [
  {
    id: "candidate",
    label: "Demandeur d'emploi",
    hint: "Publier mon profil et ma vidéo de présentation.",
    icon: UserRound,
  },
  {
    id: "recruiter",
    label: "Recruteur",
    hint: "Consulter le catalogue et contacter des candidats.",
    icon: Briefcase,
  },
];

const EMPTY_COMPANY = {
  name: "",
  siren: "",
  position: "",
  address: "",
  postalCode: "",
  city: "",
  sector: SECTORS[0] as Sector,
  phone: "",
  website: "",
};

export function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("candidate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Age declare, recalcule a chaque frappe : sert a bloquer l'envoi et a
  // afficher la mention d'information des 16-18 ans (R.1). Le serveur refait
  // le meme controle — celui-ci n'est qu'un confort de saisie.
  const declaredAge = ageOn(birthDate);
  const tooYoung = declaredAge !== null && declaredAge < MINIMUM_AGE;
  const isMinorApplicant =
    declaredAge !== null && declaredAge >= MINIMUM_AGE && declaredAge < MAJORITY_AGE;

  // Le SIREN n'est signale qu'une fois les neuf chiffres saisis : signaler une
  // erreur des le premier caractere reprocherait a la personne de ne pas avoir
  // fini d'ecrire.
  const sirenDigits = normalizeSiren(company.siren);
  const sirenInvalid = sirenDigits.length >= 9 && !isValidSiren(sirenDigits);

  function setCompanyField(field: keyof typeof EMPTY_COMPANY, value: string) {
    setCompany((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // Blocage strict avant tout appel reseau : inutile d'envoyer une
    // inscription que le serveur refusera, et le message est plus clair ici.
    if (tooYoung) {
      setError(`L'inscription est réservée aux personnes de ${MINIMUM_AGE} ans et plus.`);
      return;
    }

    if (declaredAge === null) {
      setError("Indiquez une date de naissance valide.");
      return;
    }

    if (role === "recruiter" && !isValidSiren(company.siren)) {
      setError("Le SIREN de l'entreprise est invalide : neuf chiffres attendus.");
      return;
    }

    setLoading(true);

    try {
      /**
       * Une seule requete cree le compte ET l'entreprise (`POST /api/register`).
       *
       * Passer par `authClient.signUp.email` puis envoyer l'entreprise dans un
       * second appel laisserait exister un recruteur sans entreprise des que le
       * second echoue.
       */
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          role === "recruiter"
            ? {
                role,
                name,
                email,
                password,
                birthDate,
                company: {
                  ...company,
                  phone: company.phone.trim() || undefined,
                  website: company.website.trim() || undefined,
                },
              }
            : { role, name, email, password, birthDate },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error?.message ?? "Impossible de créer le compte.");
        setLoading(false);
        return;
      }

      // Le cookie de session est deja pose par la route. On relit la session
      // plutot que de se reconnecter : une seconde authentification ouvrirait
      // une seconde session pour le meme navigateur.
      await authClient.getSession();

      router.push(data.role === "recruiter" ? "/recruiter" : "/candidate");
      router.refresh();
    } catch {
      setError("Une erreur inattendue est survenue. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="grid gap-5">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-base text-destructive"
          >
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {/*
          Choix du role, en premier : il commande la suite du formulaire, et
          une personne doit savoir quel compte elle cree avant de le remplir.
          Un `radiogroup` et non deux boutons : le clavier et les lecteurs
          d'ecran y voient bien un choix unique parmi deux.
        */}
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm text-[#2d3748]">Je crée un compte en tant que</legend>

          <div role="radiogroup" aria-label="Type de compte" className="grid gap-3 sm:grid-cols-2">
            {ROLES.map(({ id, label, hint, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={role === id}
                onClick={() => setRole(id)}
                disabled={loading}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                  role === id
                    ? "bg-[#1B3A6B] text-white"
                    : "bg-[#ebf0f7] text-[#2d3748] shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] hover:bg-[#D1DEF0]"
                }`}
              >
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <span>
                  <span className="block text-base font-semibold">{label}</span>
                  <span
                    className={`mt-0.5 block text-sm ${role === id ? "text-white/80" : "text-[#566274]"}`}
                  >
                    {hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor="name" className="text-sm text-[#2d3748]">Nom complet</Label>

          <Input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jean Dupont"
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect="off"
            disabled={loading}
            required
            className={fieldClass}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm text-[#2d3748]">Adresse e-mail</Label>

          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={role === "recruiter" ? "jean.dupont@entreprise.fr" : "jean@exemple.fr"}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={loading}
            required
            className={fieldClass}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="birthDate" className="text-sm text-[#2d3748]">Date de naissance</Label>

          <Input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            max={latestAllowedBirthDate()}
            autoComplete="bday"
            disabled={loading}
            required
            aria-describedby="birthDate-help"
            aria-invalid={tooYoung || undefined}
            className={fieldClass}
          />

          <p id="birthDate-help" className="text-sm text-[#566274]">
            L&apos;inscription est réservée aux personnes de {MINIMUM_AGE} ans et plus.
          </p>

          {tooYoung ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              Vous devez avoir au moins {MINIMUM_AGE} ans pour créer un compte sur ProfilsActifs.
            </p>
          ) : null}

          {/*
            Parcours distinct 16-18 ans (R.1) : la mention est affichee des que
            la date declaree tombe dans cette tranche, avant meme l'envoi, pour
            que la personne sache a quoi elle s'engage au moment ou elle decide.
            Elle ne concerne que les demandeurs d'emploi : c'est leur profil et
            leur video qui sont en jeu.
          */}
          {isMinorApplicant && role === "candidate" ? (
            <div
              role="note"
              className="rounded-lg border border-[#1B3A6B]/20 bg-[#1B3A6B]/5 px-4 py-3 text-sm text-[#2d3748]"
            >
              <p className="font-medium">Vous avez moins de {MAJORITY_AGE} ans</p>
              <p className="mt-1 text-[#4A6B8A]">
                Votre compte est créé normalement, mais votre présentation vidéo ne sera pas
                diffusée publiquement : elle reste visible de vous seul et de l&apos;administration.
                Votre profil n&apos;apparaît pas dans le catalogue consultable sans compte recruteur.
              </p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password" className="text-sm text-[#2d3748]">Mot de passe</Label>

          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="8 caractères minimum"
            autoComplete="new-password"
            minLength={8}
            disabled={loading}
            required
            className={fieldClass}
          />
          <p className="text-sm text-[#566274]">Doit contenir au moins 8 caractères.</p>
        </div>

        {/*
          Bloc entreprise : affiche seulement pour un recruteur, et alors
          entierement obligatoire. Contacter des candidats au nom d'une personne
          morale suppose de dire laquelle, et a quel titre on le fait.
        */}
        {role === "recruiter" ? (
          <fieldset className="grid gap-5 rounded-2xl border border-[#1B3A6B]/20 bg-[#F5F9FE] p-5">
            <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-[#2d3748]">
              <Building2 aria-hidden="true" className="size-4" />
              Votre entreprise
            </legend>

            <div className="grid gap-2">
              <Label htmlFor="companyName" className="text-sm text-[#2d3748]">Raison sociale</Label>
              <Input
                id="companyName"
                value={company.name}
                onChange={(event) => setCompanyField("name", event.target.value)}
                placeholder="Atelier Vasseur SAS"
                autoComplete="organization"
                disabled={loading}
                required
                className={fieldClass}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="siren" className="text-sm text-[#2d3748]">SIREN</Label>
              <Input
                id="siren"
                value={company.siren}
                onChange={(event) => setCompanyField("siren", event.target.value)}
                placeholder="552 100 554"
                inputMode="numeric"
                disabled={loading}
                required
                aria-describedby="siren-help"
                aria-invalid={sirenInvalid || undefined}
                className={fieldClass}
              />
              <p id="siren-help" className="text-sm text-[#566274]">
                Neuf chiffres, tels qu&apos;ils figurent à l&apos;annuaire des entreprises. Les
                espaces sont acceptés.
              </p>
              {sirenInvalid ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  Ce SIREN est invalide : vérifiez les neuf chiffres saisis.
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="position" className="text-sm text-[#2d3748]">
                Votre poste dans l&apos;entreprise
              </Label>
              <Input
                id="position"
                value={company.position}
                onChange={(event) => setCompanyField("position", event.target.value)}
                placeholder="Responsable des ressources humaines"
                autoComplete="organization-title"
                disabled={loading}
                required
                className={fieldClass}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address" className="text-sm text-[#2d3748]">Adresse</Label>
              <Input
                id="address"
                value={company.address}
                onChange={(event) => setCompanyField("address", event.target.value)}
                placeholder="12 rue des Tanneurs"
                autoComplete="street-address"
                disabled={loading}
                required
                className={fieldClass}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-[minmax(0,140px)_minmax(0,1fr)]">
              <div className="grid gap-2">
                <Label htmlFor="postalCode" className="text-sm text-[#2d3748]">Code postal</Label>
                <Input
                  id="postalCode"
                  value={company.postalCode}
                  onChange={(event) => setCompanyField("postalCode", event.target.value)}
                  placeholder="44000"
                  inputMode="numeric"
                  pattern="\d{5}"
                  autoComplete="postal-code"
                  disabled={loading}
                  required
                  className={fieldClass}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="companyCity" className="text-sm text-[#2d3748]">Ville</Label>
                <Input
                  id="companyCity"
                  value={company.city}
                  onChange={(event) => setCompanyField("city", event.target.value)}
                  placeholder="Nantes"
                  autoComplete="address-level2"
                  disabled={loading}
                  required
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="companySector" className="text-sm text-[#2d3748]">Secteur d&apos;activité</Label>
              <select
                id="companySector"
                value={company.sector}
                onChange={(event) => setCompanyField("sector", event.target.value)}
                disabled={loading}
                required
                className={`${fieldClass} w-full`}
              >
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="companyPhone" className="text-sm text-[#2d3748]">
                  Téléphone <span className="font-normal text-[#566274]">(facultatif)</span>
                </Label>
                <Input
                  id="companyPhone"
                  type="tel"
                  value={company.phone}
                  onChange={(event) => setCompanyField("phone", event.target.value)}
                  placeholder="02 40 00 00 00"
                  autoComplete="tel"
                  disabled={loading}
                  className={fieldClass}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="companyWebsite" className="text-sm text-[#2d3748]">
                  Site web <span className="font-normal text-[#566274]">(facultatif)</span>
                </Label>
                <Input
                  id="companyWebsite"
                  value={company.website}
                  onChange={(event) => setCompanyField("website", event.target.value)}
                  placeholder="https://exemple.fr"
                  autoComplete="url"
                  disabled={loading}
                  className={fieldClass}
                />
              </div>
            </div>
          </fieldset>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={loading || tooYoung}
          className="mt-1 h-11 w-full rounded-xl bg-[#1B3A6B] text-base text-white shadow-[6px_6px_12px_#c5d1e0,-6px_-6px_12px_#ffffff] hover:bg-[#273D4F] hover:shadow-[inset_3px_3px_6px_#273D4F,inset_-3px_-3px_6px_#4A6B8A]"
        >
          {loading ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
          {loading
            ? "Création du compte..."
            : role === "recruiter"
              ? "Créer le compte recruteur"
              : "Créer le compte"}
        </Button>
      </form>
      <p className="text-center text-base text-[#566274]">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-[#273D4F] underline underline-offset-4 transition-colors hover:text-[#1B3A6B]"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
