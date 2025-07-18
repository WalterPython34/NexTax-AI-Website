import { defineConfig } from "drizzle-kit"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Ensure the database is provisioned")
}

export default defineConfig({
  out: "./migrations",
  schema: "./lib/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
