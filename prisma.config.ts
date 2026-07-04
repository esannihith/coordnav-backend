import "dotenv/config";
import { defineConfig } from "prisma/config";

// Deliberately not importing src/config/env.ts here: that module throws if any
// app env var is missing, but `prisma generate` (run from postinstall in Docker
// builds and CI, where no secrets exist) needs no env at all. Only migrate/db
// commands read the datasource url.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
