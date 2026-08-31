import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Monte tout better-auth sous /api/auth/* : /sign-up/email, /sign-in/email,
// /sign-out, /get-session... Une seule route catch-all, rien a maintenir.
export const { GET, POST } = toNextJsHandler(auth.handler);
