"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Client better-auth pour les composants client. baseURL vide = meme
 * origine, ce qui evite d'avoir a exposer une URL differente par environnement.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "",
});

export const { signIn, signUp, signOut, useSession } = authClient;
