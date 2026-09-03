"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message ?? "Identifiants invalides. Réessayez.");
        setLoading(false);
        return;
      }

      const session = await authClient.getSession();

      if (!session.data?.user) {
        setError("Impossible de récupérer la session actuelle.");
        setLoading(false);
        return;
      }

      const destination =
        session.data.user.role === "admin"
          ? "/admin"
          : session.data.user.role === "recruiter"
            ? "/recruiter"
            : "/candidate";

      router.push(destination);
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

        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm text-[#2d3748]">Adresse e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            aria-invalid={Boolean(error)}
            required
            className="h-11 rounded-xl border-0 bg-[#ebf0f7] px-3.5 text-base shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] placeholder:text-[#566274] focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-[#1B3A6B]/30 md:text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password" className="text-sm text-[#2d3748]">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            aria-invalid={Boolean(error)}
            required
            className="h-11 rounded-xl border-0 bg-[#ebf0f7] px-3.5 text-base shadow-[inset_4px_4px_8px_#c5d1e0,inset_-4px_-4px_8px_#ffffff] placeholder:text-[#566274] focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-[#1B3A6B]/30 md:text-base"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="mt-1 h-11 w-full rounded-xl bg-[#1B3A6B] text-base text-white shadow-[6px_6px_12px_#c5d1e0,-6px_-6px_12px_#ffffff] hover:bg-[#273D4F] hover:shadow-[inset_3px_3px_6px_#273D4F,inset_-3px_-3px_6px_#4A6B8A]"
        >
          {loading ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : null}
          {loading ? "Connexion..." : "Se connecter"}
        </Button>
      </form>

      <p className="text-center text-base text-[#566274]">
        Vous n&apos;avez pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-medium text-[#273D4F] underline underline-offset-4 transition-colors hover:text-[#1B3A6B]"
        >
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}
