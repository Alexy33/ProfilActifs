import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Créer un compte - ProfilsActifs",
  description: "Rejoignez ProfilsActifs et valorisez votre profil professionnel.",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-[#2d3748]">
          Créer un compte
        </h1>
        <p className="text-base text-[#718096]">
          Renseignez vos informations pour commencer.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
