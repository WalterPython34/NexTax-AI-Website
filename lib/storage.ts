import { createClient } from "@supabase/supabase-js"
import type {
  InsertUser,
  InsertBusinessProfile,
  InsertDocument,
  InsertConversation,
  InsertMessage,
  InsertProgressTask,
  InsertComplianceItem,
} from "./schema"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const storage = {
  // User operations
  async getUser(userId: string) {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

    if (error && error.code !== "PGRST116") throw error
    return data
  },

  async createUser(userData: InsertUser) {
    const { data, error } = await supabase.from("users").insert(userData).select().single()

    if (error) throw error
    return data
  },

  async updateUser(userId: string, updates: Partial<InsertUser>) {
    const { data, error } = await supabase
      .from("users")
      .update({ ...updates, updatedAt: new Date() })
      .eq("id", userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Business Profile operations
  async getUserBusinessProfiles(userId: string) {
    const { data, error } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })

    if (error) throw error
    return data || []
  },

  async getBusinessProfile(businessId: string) {
    const { data, error } = await supabase.from("business_profiles").select("*").eq("id", businessId).single()

    if (error && error.code !== "PGRST116") throw error
    return data
  },

  async createBusinessProfile(profileData: InsertBusinessProfile) {
    const { data, error } = await supabase.from("business_profiles").insert(profileData).select().single()

    if (error) throw error
    return data
  },

  async updateBusinessProfile(businessId: string, updates: Partial<InsertBusinessProfile>) {
    const { data, error } = await supabase
      .from("business_profiles")
      .update({ ...updates, updatedAt: new Date() })
      .eq("id", businessId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Document operations
  async getUserDocuments(userId: string) {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false })

    if (error) throw error
    return data || []
  },

  async getDocument(documentId: string) {
    const { data, error } = await supabase.from("documents").select("*").eq("id", documentId).single()

    if (error && error.code !== "PGRST116") throw error
    return data
  },

  async createDocument(documentData: InsertDocument) {
    const { data, error } = await supabase.from("documents").insert(documentData).select().single()

    if (error) throw error
    return data
  },

  async updateDocument(documentId: string, updates: Partial<InsertDocument>) {
    const { data, error } = await supabase
      .from("documents")
      .update({ ...updates, updatedAt: new Date() })
      .eq("id", documentId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteDocument(documentId: string) {
    const { error } = await supabase.from("documents").delete().eq("id", documentId)

    if (error) throw error
  },

  // Conversation operations
  async getUserConversations(userId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false })

    if (error) throw error
    return data || []
  },

  async getConversation(conversationId: string) {
    const { data, error } = await supabase.from("conversations").select("*").eq("id", conversationId).single()

    if (error && error.code !== "PGRST116") throw error
    return data
  },

  async createConversation(conversationData: InsertConversation) {
    const { data, error } = await supabase.from("conversations").insert(conversationData).select().single()

    if (error) throw error
    return data
  },

  async updateConversationTitle(conversationId: string, title: string) {
    const { data, error } = await supabase
      .from("conversations")
      .update({ title, updatedAt: new Date() })
      .eq("id", conversationId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Message operations
  async getConversationMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: true })

    if (error) throw error
    return data || []
  },

  async createMessage(messageData: InsertMessage) {
    const { data, error } = await supabase.from("messages").insert(messageData).select().single()

    if (error) throw error
    return data
  },

  // Progress Task operations
  async getUserProgressTasks(userId: string, businessId?: string) {
    let query = supabase.from("progress_tasks").select("*").eq("userId", userId)

    if (businessId) {
      query = query.eq("businessId", businessId)
    }

    const { data, error } = await query.order("createdAt", { ascending: false })

    if (error) throw error
    return data || []
  },

  async createProgressTask(taskData: InsertProgressTask) {
    const { data, error } = await supabase.from("progress_tasks").insert(taskData).select().single()

    if (error) throw error
    return data
  },

  async updateProgressTask(taskId: string, updates: Partial<InsertProgressTask>) {
    const { data, error } = await supabase
      .from("progress_tasks")
      .update({ ...updates, updatedAt: new Date() })
      .eq("id", taskId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async createDefaultProgressTasks(userId: string, businessId: string) {
    const defaultTasks = [
      {
        userId,
        businessId,
        title: "Choose Business Structure",
        description: "Decide between LLC, Corporation, or other business entity types",
        category: "formation" as const,
        priority: "high" as const,
      },
      {
        userId,
        businessId,
        title: "File Articles of Incorporation/Organization",
        description: "Submit formation documents to your state",
        category: "formation" as const,
        priority: "high" as const,
      },
      {
        userId,
        businessId,
        title: "Obtain EIN from IRS",
        description: "Get your federal tax identification number",
        category: "tax" as const,
        priority: "high" as const,
      },
      {
        userId,
        businessId,
        title: "Open Business Bank Account",
        description: "Separate business and personal finances",
        category: "operational" as const,
        priority: "medium" as const,
      },
      {
        userId,
        businessId,
        title: "Set Up Accounting System",
        description: "Choose and implement bookkeeping solution",
        category: "operational" as const,
        priority: "medium" as const,
      },
    ]

    const { data, error } = await supabase.from("progress_tasks").insert(defaultTasks).select()

    if (error) throw error
    return data
  },

  // Usage tracking operations
  async getUserCurrentUsage(userId: string) {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    const { data, error } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("userId", userId)
      .eq("month", currentMonth)
      .single()

    if (error && error.code !== "PGRST116") throw error

    return data || { messageCount: 0, documentCount: 0 }
  },

  async createOrUpdateUsage(userId: string, month: string, messageIncrement: number, documentIncrement: number) {
    const { data: existing } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("userId", userId)
      .eq("month", month)
      .single()

    if (existing) {
      const { data, error } = await supabase
        .from("usage_tracking")
        .update({
          messageCount: existing.messageCount + messageIncrement,
          documentCount: existing.documentCount + documentIncrement,
          updatedAt: new Date(),
        })
        .eq("userId", userId)
        .eq("month", month)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from("usage_tracking")
        .insert({
          userId,
          month,
          messageCount: messageIncrement,
          documentCount: documentIncrement,
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  },

  // Compliance operations
  async getUserComplianceItems(userId: string, businessId?: string) {
    let query = supabase.from("compliance_items").select("*").eq("userId", userId)

    if (businessId) {
      query = query.eq("businessId", businessId)
    }

    const { data, error } = await query.order("dueDate", { ascending: true })

    if (error) throw error
    return data || []
  },

  async createComplianceItem(itemData: InsertComplianceItem) {
    const { data, error } = await supabase.from("compliance_items").insert(itemData).select().single()

    if (error) throw error
    return data
  },

  async updateComplianceItem(itemId: string, updates: Partial<InsertComplianceItem>) {
    const { data, error } = await supabase
      .from("compliance_items")
      .update({ ...updates, updatedAt: new Date() })
      .eq("id", itemId)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
