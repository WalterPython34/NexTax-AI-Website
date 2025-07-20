import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// Database configuration using Neon
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL environment variable is required")
}

// Use Neon serverless driver
const sql = neon(DATABASE_URL)
const db = drizzle(sql)

export { db }

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}
