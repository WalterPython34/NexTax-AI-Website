import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { neon } from "@neondatabase/serverless"
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http"

// Database configuration that can switch between Neon and Supabase
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL environment variable is required")
}

// Determine which database driver to use based on the URL
const isNeon = DATABASE_URL.includes("neon.tech") || DATABASE_URL.includes("neon.database")
const isSupabase = DATABASE_URL.includes("supabase.co")

let db: any

if (isNeon) {
  // Use Neon serverless driver
  const sql = neon(DATABASE_URL)
  db = drizzleNeon(sql)
} else if (isSupabase) {
  // Use postgres-js for Supabase
  const client = postgres(DATABASE_URL, { prepare: false })
  db = drizzle(client)
} else {
  // Default to postgres-js
  const client = postgres(DATABASE_URL, { prepare: false })
  db = drizzle(client)
}

export { db }

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.execute("SELECT 1")
    return true
  } catch (error) {
    console.error("Database connection failed:", error)
    return false
  }
}
