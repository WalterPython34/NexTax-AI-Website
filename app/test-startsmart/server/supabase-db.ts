import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Supabase configuration
const supabaseUrl = 'https://sgrosezedxunoicmglpj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncm9zZXplZHh1bm9pY21nbHBqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY0NDk1NiwiZXhwIjoyMDY2MjIwOTU2fQ.EagJ2z9HUZS9LSrLLeXtLmp2978VA5rUfdFW-5paW_o';

// Create Supabase connection string for Drizzle
const supabaseConnectionString = `postgresql://postgres.sgrosezedxunoicmglpj:${encodeURIComponent('J1mRSH05AbCIjBQyQhwFMI+XCCvyDUOKxbSs+fO5CraZr8nm8w1wvPkU/Aa+vvkpifeO73Fla06In1CvMz1woQ==')}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

// Create Drizzle client for database operations
const client = postgres(supabaseConnectionString, { 
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const supabaseDb = drizzle(client, { schema });

// Create Supabase client for auth and real-time features
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper functions for shared authentication
export async function getUser(accessToken: string) {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error) throw error;
  return user;
}

export async function getSubscriptionStatus(userId: string) {
  try {
    // Query from shared subscriptions table
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('tier, status, expires_at')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching subscription:', error);
      return { tier: 'free', status: 'active' };
    }
    
    return data;
  } catch (error) {
    console.error('Subscription lookup failed:', error);
    return { tier: 'free', status: 'active' };
  }
}

export async function syncUserFromNexTax(userData: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier?: string;
}) {
  try {
    // Insert or update user in our local schema
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        subscriptionTier: userData.subscriptionTier || 'free',
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('User sync failed:', error);
    throw error;
  }
}