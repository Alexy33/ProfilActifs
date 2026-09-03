"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutGrid, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function LandingSessionActions({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.refresh();
    setSigningOut(false);
  }

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <Button
          asChild
          className="rounded-2xl bg-[#5980a6] px-5 font-semibold text-white shadow-[6px_6px_12px_#c5d1e0,-6px_-6px_12px_#ffffff] hover:bg-[#416180] active:scale-[0.97]"
        >
          <Link href="/catalogue">
            <LayoutGrid aria-hidden="true" className="size-4" />
            Catalogue
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={signOut}
          disabled={signingOut}
          className="rounded-2xl bg-[#ebf0f7] px-5 font-semibold text-[#2d3748] shadow-[5px_5px_10px_#c5d1e0,-5px_-5px_10px_#ffffff] hover:bg-[#ebf0f7] hover:shadow-[inset_3px_3px_6px_#c5d1e0,inset_-3px_-3px_6px_#ffffff] disabled:opacity-60"
        >
          <LogOut aria-hidden="true" className="size-4" />
          {signingOut ? "Déconnexion…" : "Déconnexion"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        asChild
        className="rounded-2xl bg-[#5980a6] px-5 font-semibold text-white shadow-[6px_6px_12px_#c5d1e0,-6px_-6px_12px_#ffffff] hover:bg-[#416180] active:scale-[0.97]"
      >
        <Link href="/catalogue">
          <LayoutGrid aria-hidden="true" className="size-4" />
          Catalogue
        </Link>
      </Button>
      <Button
        asChild
        variant="ghost"
        className="rounded-2xl bg-[#ebf0f7] px-5 font-semibold text-[#2d3748] shadow-[5px_5px_10px_#c5d1e0,-5px_-5px_10px_#ffffff] hover:bg-[#ebf0f7] hover:shadow-[inset_3px_3px_6px_#c5d1e0,inset_-3px_-3px_6px_#ffffff] active:scale-[0.97]"
      >
        <Link href="/login">Connexion</Link>
      </Button>
      <Button
        asChild
        className="rounded-2xl bg-[#5980a6] px-6 font-semibold text-white shadow-[6px_6px_12px_#c5d1e0,-6px_-6px_12px_#ffffff] hover:bg-[#416180] active:scale-[0.97]"
      >
        <Link href="/register">Créer un profil</Link>
      </Button>
    </div>
  );
}
