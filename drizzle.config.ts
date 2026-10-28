import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schemaFilter: ["public"],
  dialect: "postgresql",
  schema: ["./src/db/schemas", "./auth-schema.ts"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
