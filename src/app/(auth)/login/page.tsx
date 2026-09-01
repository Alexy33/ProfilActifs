import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in - ProfilsActifs",
  description: "Sign in to your ProfilsActifs account.",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-base text-muted-foreground">
          Enter your credentials to access your account.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
