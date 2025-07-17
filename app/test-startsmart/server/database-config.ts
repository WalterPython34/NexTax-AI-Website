// Database configuration that can switch between Neon and Supabase
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Environment-based database selection
const USE_SUPABASE = process.env.USE_SUPABASE === 'true';
const DATABASE_URL = process.env.DATABASE_URL;

// Supabase configuration
const SUPABASE_CONNECTION_STRING = 'postgresql://postgres.sgrosezedxunoicmglpj:J1mRSH05AbCIjBQyQhwFMI%2BXCCvyDUOKxbSs%2BfO5CraZr8nm8w1wvPkU%2FAa%2BvvkpifeO73Fla06In1CvMz1woQ%3D%3D@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

if (!DATABASE_URL && !USE_SUPABASE) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create database connection based on configuration
export const db = USE_SUPABASE ? 
  drizzlePostgres(postgres(SUPABASE_CONNECTION_STRING, { 
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  }), { schema }) :
  drizzleNeon({ 
    client: new Pool({ connectionString: DATABASE_URL }), 
    schema 
  });

export const isUsingSupabase = USE_SUPABASE;

console.log(`Database: Using ${USE_SUPABASE ? 'Supabase' : 'Neon'} connection`);