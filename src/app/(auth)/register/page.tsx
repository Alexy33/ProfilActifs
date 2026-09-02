import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account - ProfilsActifs",
  description: "Join ProfilsActifs and showcase your professional profile.",
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="text-base text-muted-foreground">
          Enter your details below to get started.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
