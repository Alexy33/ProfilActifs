/**
 * Import de tous les modules de route.
 *
 * Next.js charge chaque `route.ts` a la demande : sans cet import explicite,
 * `/api/openapi` ne verrait que les routes deja visitees et la documentation
 * serait incomplete de facon imprevisible. Importer un module suffit a
 * enregistrer sa definition (effet de bord de `defineRoute`).
 *
 * TOUT NOUVEAU FICHIER DE ROUTE DOIT ETRE AJOUTE ICI. Le test
 * `src/server/openapi/__tests__/manifest.test.ts` echoue si on l'oublie.
 */

import "@/app/api/health/route";
import "@/app/api/ping/route";
import "@/app/api/reference/route";
import "@/app/api/stats/route";

import "@/app/api/profiles/route";
import "@/app/api/profiles/[id]/route";
import "@/app/api/profiles/[id]/contact/route";

import "@/app/api/me/profile/route";
import "@/app/api/me/profile/video/consent/route";
import "@/app/api/me/stats/route";
import "@/app/api/me/notifications/route";
import "@/app/api/me/notifications/read/route";

import "@/app/api/certification/questions/route";
import "@/app/api/me/certification/route";
import "@/app/api/me/certification/answers/route";
import "@/app/api/me/certification/submit/route";
import "@/app/api/me/certification/restart/route";

import "@/app/api/me/favorites/route";
import "@/app/api/me/favorites/[profileId]/route";
import "@/app/api/me/contacts/route";
import "@/app/api/me/contacts/[id]/route";

import "@/app/api/register/route";
import "@/app/api/me/company/route";
import "@/app/api/admin/stats/route";
import "@/app/api/admin/profiles/route";
import "@/app/api/admin/profiles/[id]/route";
import "@/app/api/admin/videos/route";
import "@/app/api/admin/videos/[id]/route";
import "@/app/api/admin/questions/route";
import "@/app/api/admin/questions/[id]/route";
import "@/app/api/admin/settings/route";
