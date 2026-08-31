import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  // Ce dossier est COPIE dans l'image finale par le Dockerfile.
  // Il doit exister dans le depot (un .gitkeep suffit) sinon le
  // `COPY /app/drizzle` du stage runner echoue.
  out: "./drizzle",
  dbCredentials: {
    url: (process.env.DATABASE_URL ?? "file:./local.db").replace(/^file:/, ""),
  },
});
