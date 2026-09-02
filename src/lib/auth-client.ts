"use client";

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

/**
 * Client better-auth pour les composants client. baseURL vide = meme
 * origine, ce qui evite d'avoir a exposer une URL differente par environnement.
 *
 * `inferAdditionalFields` rejoue le type de l'instance serveur : sans lui le
 * client ignore le champ `role` declare dans src/lib/auth.ts, et l'inscription
 * ne pourrait pas transmettre le role choisi. L'import est un `import type` :
 * rien du module serveur n'atterrit dans le bundle navigateur.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
