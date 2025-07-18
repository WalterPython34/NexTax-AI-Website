import { createClient } from "@supabase/supabase-js"
import type {
  UserProfile,
  BusinessProfile,
  Document,
  ChatMessage,
  Conversation,
  ComplianceItem,
  Task,
  UsageRecord,
} from "./schema"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// User operations
export async function createUserProfile(profile: Omit<UserProfile, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("user_profiles").insert(profile).select().single()

  if (error) throw error
  return data
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single()

  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Business profile operations
export async function createBusinessProfile(profile: Omit<BusinessProfile, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("business_profiles").insert(profile).select().single()

  if (error) throw error
  return data
}

export async function getBusinessProfile(profileId: string) {
  const { data, error } = await supabase.from("business_profiles").select("*").eq("id", profileId).single()

  if (error) throw error
  return data
}

export async function getUserBusinessProfiles(userId: string) {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function updateBusinessProfile(profileId: string, updates: Partial<BusinessProfile>) {
  const { data, error } = await supabase
    .from("business_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Document operations
export async function createDocument(document: Omit<Document, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("documents").insert(document).select().single()

  if (error) throw error
  return data
}

export async function getDocument(documentId: string) {
  const { data, error } = await supabase.from("documents").select("*").eq("id", documentId).single()

  if (error) throw error
  return data
}

export async function getUserDocuments(userId: string, filters?: { type?: string; status?: string }) {
  let query = supabase.from("documents").select("*").eq("user_id", userId)

  if (filters?.type) {
    query = query.eq("type", filters.type)
  }
  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function updateDocument(documentId: string, updates: Partial<Document>) {
  const { data, error } = await supabase
    .from("documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", documentId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDocument(documentId: string) {
  const { error } = await supabase.from("documents").delete().eq("id", documentId)

  if (error) throw error
}

// Conversation operations
export async function createConversation(conversation: Omit<Conversation, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("conversations").insert(conversation).select().single()

  if (error) throw error
  return data
}

export async function getConversation(conversationId: string) {
  const { data, error } = await supabase.from("conversations").select("*").eq("id", conversationId).single()

  if (error) throw error
  return data
}

export async function getUserConversations(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })

  if (error) throw error
  return data
}

// Message operations
export async function createMessage(message: Omit<ChatMessage, "id" | "created_at">) {
  const { data, error } = await supabase.from("chat_messages").insert(message).select().single()

  if (error) throw error
  return data
}

export async function getConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data
}

// Compliance operations
export async function createComplianceItem(item: Omit<ComplianceItem, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("compliance_items").insert(item).select().single()

  if (error) throw error
  return data
}

export async function getBusinessComplianceItems(businessProfileId: string) {
  const { data, error } = await supabase
    .from("compliance_items")
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .order("due_date", { ascending: true })

  if (error) throw error
  return data
}

export async function updateComplianceItem(itemId: string, updates: Partial<ComplianceItem>) {
  const { data, error } = await supabase
    .from("compliance_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", itemId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Task operations
export async function createTask(task: Omit<Task, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("tasks").insert(task).select().single()

  if (error) throw error
  return data
}

export async function getUserTasks(userId: string, filters?: { status?: string; category?: string }) {
  let query = supabase.from("tasks").select("*").eq("user_id", userId)

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.category) {
    query = query.eq("category", filters.category)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Usage tracking
export async function recordUsage(usage: Omit<UsageRecord, "id" | "created_at">) {
  const { data, error } = await supabase.from("usage_records").insert(usage).select().single()

  if (error) throw error
  return data
}

export async function getUserUsage(userId: string, actionType?: string, timeframe?: string) {
  let query = supabase.from("usage_records").select("*").eq("user_id", userId)

  if (actionType) {
    query = query.eq("action_type", actionType)
  }

  if (timeframe) {
    const now = new Date()
    let startDate: Date

    switch (timeframe) {
      case "daily":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(0)
    }

    query = query.gte("created_at", startDate.toISOString())
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getUserUsageCount(userId: string, actionType: string, timeframe: string): Promise<number> {
  const records = await getUserUsage(userId, actionType, timeframe)
  return records.reduce((total, record) => total + record.count, 0)
}

