import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface UserProfile {
  id: string
  email: string
  name: string
  created_at: string
  subscription_status?: string
  stripe_customer_id?: string
}

export interface BusinessProfile {
  id: string
  user_id: string
  business_name: string
  business_type: string
  industry: string
  state: string
  formation_status: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  user_id: string
  business_id?: string
  title: string
  type: string
  content: any
  status: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  business_id?: string
  title: string
  description: string
  status: string
  priority: string
  due_date?: string
  category: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: string
  content: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}

export interface ComplianceItem {
  id: string
  user_id: string
  business_id?: string
  title: string
  description: string
  status: string
  due_date?: string
  priority: string
  category: string
  created_at: string
  updated_at: string
}

// User Profile Operations
export const userStorage = {
  async create(userData: Omit<UserProfile, "id" | "created_at">) {
    const { data, error } = await supabase.from("user_profiles").insert(userData).select().single()

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("user_profiles").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async getByEmail(email: string) {
    const { data, error } = await supabase.from("user_profiles").select("*").eq("email", email).single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<UserProfile>) {
    const { data, error } = await supabase.from("user_profiles").update(updates).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  async updateUsage(userId: string, increment = 1) {
    const { data, error } = await supabase.rpc("increment_user_usage", {
      user_id: userId,
      increment_by: increment,
    })

    if (error) throw error
    return data
  },
}

// Business Profile Operations
export const businessStorage = {
  async create(businessData: Omit<BusinessProfile, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("business_profiles").insert(businessData).select().single()

    if (error) throw error
    return data
  },

  async getByUserId(userId: string) {
    const { data, error } = await supabase.from("business_profiles").select("*").eq("user_id", userId)

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("business_profiles").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<BusinessProfile>) {
    const { data, error } = await supabase
      .from("business_profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("business_profiles").delete().eq("id", id)

    if (error) throw error
  },
}

// Document Operations
export const documentStorage = {
  async create(documentData: Omit<Document, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("documents").insert(documentData).select().single()

    if (error) throw error
    return data
  },

  async getByUserId(userId: string, filters?: { type?: string; status?: string }) {
    let query = supabase.from("documents").select("*").eq("user_id", userId).order("created_at", { ascending: false })

    if (filters?.type) {
      query = query.eq("type", filters.type)
    }

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("documents").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Document>) {
    const { data, error } = await supabase
      .from("documents")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("documents").delete().eq("id", id)

    if (error) throw error
  },
}

// Task Operations
export const taskStorage = {
  async create(taskData: Omit<Task, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("tasks").insert(taskData).select().single()

    if (error) throw error
    return data
  },

  async getByUserId(userId: string, filters?: { status?: string; priority?: string; category?: string }) {
    let query = supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false })

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    if (filters?.priority) {
      query = query.eq("priority", filters.priority)
    }

    if (filters?.category) {
      query = query.eq("category", filters.category)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Task>) {
    const { data, error } = await supabase
      .from("tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", id)

    if (error) throw error
  },

  async getUpcoming(userId: string, days = 7) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .lte("due_date", futureDate.toISOString())
      .order("due_date", { ascending: true })

    if (error) throw error
    return data
  },
}

// Conversation Operations
export const conversationStorage = {
  async create(conversationData: Omit<Conversation, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("conversations").insert(conversationData).select().single()

    if (error) throw error
    return data
  },

  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("conversations").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Conversation>) {
    const { data, error } = await supabase
      .from("conversations")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("conversations").delete().eq("id", id)

    if (error) throw error
  },
}

// Message Operations
export const messageStorage = {
  async create(messageData: Omit<Message, "id" | "created_at">) {
    const { data, error } = await supabase.from("messages").insert(messageData).select().single()

    if (error) throw error
    return data
  },

  async getByConversationId(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("messages").delete().eq("id", id)

    if (error) throw error
  },
}

// Notification Operations
export const notificationStorage = {
  async create(notificationData: Omit<Notification, "id" | "created_at">) {
    const { data, error } = await supabase.from("notifications").insert(notificationData).select().single()

    if (error) throw error
    return data
  },

  async getByUserId(userId: string, unreadOnly = false) {
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (unreadOnly) {
      query = query.eq("read", false)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  async markAsRead(id: string) {
    const { data, error } = await supabase.from("notifications").update({ read: true }).eq("id", id).select().single()

    if (error) throw error
    return data
  },

  async markAllAsRead(userId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("notifications").delete().eq("id", id)

    if (error) throw error
  },
}

// Compliance Operations
export const complianceStorage = {
  async create(complianceData: Omit<ComplianceItem, "id" | "created_at" | "updated_at">) {
    const { data, error } = await supabase.from("compliance_items").insert(complianceData).select().single()

    if (error) throw error
    return data
  },

  async getByUserId(userId: string, filters?: { status?: string; priority?: string; category?: string }) {
    let query = supabase
      .from("compliance_items")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true })

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    if (filters?.priority) {
      query = query.eq("priority", filters.priority)
    }

    if (filters?.category) {
      query = query.eq("category", filters.category)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase.from("compliance_items").select("*").eq("id", id).single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<ComplianceItem>) {
    const { data, error } = await supabase
      .from("compliance_items")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from("compliance_items").delete().eq("id", id)

    if (error) throw error
  },

  async getUpcomingDeadlines(userId: string, days = 30) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)

    const { data, error } = await supabase
      .from("compliance_items")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "completed")
      .lte("due_date", futureDate.toISOString())
      .order("due_date", { ascending: true })

    if (error) throw error
    return data
  },
}

// Analytics and Reporting
export const analyticsStorage = {
  async getUserStats(userId: string) {
    const [businessProfiles, documents, tasks, conversations, complianceItems] = await Promise.all([
      businessStorage.getByUserId(userId),
      documentStorage.getByUserId(userId),
      taskStorage.getByUserId(userId),
      conversationStorage.getByUserId(userId),
      complianceStorage.getByUserId(userId),
    ])

    return {
      businessCount: businessProfiles.length,
      documentCount: documents.length,
      taskCount: tasks.length,
      conversationCount: conversations.length,
      complianceCount: complianceItems.length,
      completedTasks: tasks.filter((t) => t.status === "completed").length,
      pendingTasks: tasks.filter((t) => t.status === "pending").length,
      completedCompliance: complianceItems.filter((c) => c.status === "completed").length,
      pendingCompliance: complianceItems.filter((c) => c.status === "pending").length,
    }
  },
}

export default {
  user: userStorage,
  business: businessStorage,
  document: documentStorage,
  task: taskStorage,
  conversation: conversationStorage,
  message: messageStorage,
  notification: notificationStorage,
  compliance: complianceStorage,
  analytics: analyticsStorage,
}
