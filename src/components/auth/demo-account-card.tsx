"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";

interface DemoAccountCardProps {
  role: string;
  email: string;
  color: string;
  destination: "/candidate" | "/recruiter" | "/admin";
}

export function DemoAccountCard({ role, email, color, destination }: DemoAccountCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setLoading(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password: "demo1234" });

    if (result.error) {
      setError("Connexion impossible. Vérifiez que la base de démonstration est initialisée.");
      setLoading(false);
      return;
    }

    router.push(destination);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={loading}
      className="group rounded-2xl border border-[#5980a6]/15 bg-white p-5 text-left transition-colors hover:border-[#5980a6]/45 hover:bg-[#f8fbff] disabled:cursor-wait disabled:opacity-70"
    >
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${color}`}>
        {role}
      </span>
      <span className="mt-5 block break-all font-mono text-sm font-semibold text-[#2d3748]">
        {email}
      </span>
      <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#5980a6] group-hover:text-[#416180]">
        {loading ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Connexion…
          </>
        ) : (
          <>
            Ouvrir l&apos;espace {role.toLowerCase()}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </span>
      {error ? <span className="mt-3 block text-xs text-[#8a3f5b]">{error}</span> : null}
    </button>
  );
}
