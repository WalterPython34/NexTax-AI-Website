import { createClient } from '@supabase/supabase-js';

// Supabase configuration for shared authentication with NexTax.AI
const supabaseUrl = 'https://sgrosezedxunoicmglpj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncm9zZXplZHh1bm9pY21nbHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NDQ5NTYsImV4cCI6MjA2NjIyMDk1Nn0.szuuqXIxtyN_SLr9c1x3ORgkLGBT1WbWLZUsg7HQM0s';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// User authentication helpers
export async function getUser(accessToken: string) {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error) throw error;
  return user;
}

export async function getSubscriptionStatus(userId: string) {
  // Query user subscription from shared NexTax.AI subscriptions table
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('tier, status, expires_at')
    .eq('user_id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching subscription:', error);
    return { tier: 'free', status: 'inactive' };
  }
  
  return data;
}

export async function updateUserProfile(userId: string, profileData: any) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, ...profileData })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function syncUserFromNexTax(userData: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionTier?: string;
}) {
  try {
    // Insert or update user in our local schema via Supabase
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