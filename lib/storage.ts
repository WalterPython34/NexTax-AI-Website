import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const storage = {
  // User operations
  async getUser(userId: string) {
    const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()
    if (error) throw error
    return data
  },

  async createUser(userData: any) {
    const { data, error } = await supabase.from("users").insert(userData).select().single()
    if (error) throw error
    return data
  },

  // Business Profile operations
  async getUserBusinessProfiles(userId: string) {
    const { data, error } = await supabase.from("business_profiles").select("*").eq("user_id", userId)
    if (error) throw error
    return data
  },

  async getBusinessProfile(businessId: string) {
    const { data, error } = await supabase.from("business_profiles").select("*").eq("id", businessId).single()
    if (error) throw error
    return data
  },

  async createBusinessProfile(profileData: any) {
    const { data, error } = await supabase.from("business_profiles").insert(profileData).select().single()
    if (error) throw error
    return data
  },

  async updateBusinessProfile(businessId: string, updates: any) {
    const { data, error } = await supabase
      .from("business_profiles")
      .update(updates)
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
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async createDocument(documentData: any) {
    const { data, error } = await supabase.from("documents").insert(documentData).select().single()
    if (error) throw error
    return data
  },

  async updateDocument(documentId: string, updates: any) {
    const { data, error } = await supabase.from("documents").update(updates).eq("id", documentId).select().single()
    if (error) throw error
    return data
  },

  async deleteDocument(documentId: string) {
    const { error } = await supabase.from("documents").delete().eq("id", documentId)
    if (error) throw error
  },

  // Progress operations
  async getUserProgress(userId: string, businessId?: string) {
    let query = supabase.from("progress").select("*").eq("user_id", userId)
    if (businessId) {
      query = query.eq("business_id", businessId)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createProgressItem(progressData: any) {
    const { data, error } = await supabase.from("progress").insert(progressData).select().single()
    if (error) throw error
    return data
  },

  async updateProgressItem(progressId: string, updates: any) {
    const { data, error } = await supabase.from("progress").update(updates).eq("id", progressId).select().single()
    if (error) throw error
    return data
  },

  // Compliance operations
  async getUserCompliance(userId: string) {
    const { data, error } = await supabase.from("compliance").select("*").eq("user_id", userId)
    if (error) throw error
    return data
  },

  async getComplianceItem(complianceId: string) {
    const { data, error } = await supabase.from("compliance").select("*").eq("id", complianceId).single()
    if (error) throw error
    return data
  },

  async createComplianceItem(complianceData: any) {
    const { data, error } = await supabase.from("compliance").insert(complianceData).select().single()
    if (error) throw error
    return data
  },

  async updateComplianceItem(complianceId: string, updates: any) {
    const { data, error } = await supabase.from("compliance").update(updates).eq("id", complianceId).select().single()
    if (error) throw error
    return data
  },

  async deleteComplianceItem(complianceId: string) {
    const { error } = await supabase.from("compliance").delete().eq("id", complianceId)
    if (error) throw error
  },

  // Task operations
  async getUserTasks(userId: string, filters: any = {}) {
    let query = supabase.from("tasks").select("*").eq("user_id", userId)

    if (filters.businessId) query = query.eq("business_id", filters.businessId)
    if (filters.status) query = query.eq("status", filters.status)
    if (filters.category) query = query.eq("category", filters.category)
    if (filters.priority) query = query.eq("priority", filters.priority)

    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async getTask(taskId: string) {
    const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).single()
    if (error) throw error
    return data
  },

  async createTask(taskData: any) {
    const { data, error } = await supabase.from("tasks").insert(taskData).select().single()
    if (error) throw error
    return data
  },

  async updateTask(taskId: string, updates: any) {
    const { data, error } = await supabase.from("tasks").update(updates).eq("id", taskId).select().single()
    if (error) throw error
    return data
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId)
    if (error) throw error
  },

  // Compliance task operations
  async getComplianceTasks(userId: string, filters: any = {}) {
    let query = supabase.from("compliance_tasks").select("*").eq("user_id", userId)

    if (filters.businessId) query = query.eq("business_id", filters.businessId)
    if (filters.status) query = query.eq("status", filters.status)

    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async getComplianceTask(taskId: string) {
    const { data, error } = await supabase.from("compliance_tasks").select("*").eq("id", taskId).single()
    if (error) throw error
    return data
  },

  async createComplianceTask(taskData: any) {
    const { data, error } = await supabase.from("compliance_tasks").insert(taskData).select().single()
    if (error) throw error
    return data
  },

  async updateComplianceTask(taskId: string, updates: any) {
    const { data, error } = await supabase.from("compliance_tasks").update(updates).eq("id", taskId).select().single()
    if (error) throw error
    return data
  },

  async deleteComplianceTask(taskId: string) {
    const { error } = await supabase.from("compliance_tasks").delete().eq("id", taskId)
    if (error) throw error
  },

  // Notification operations
  async getUserNotifications(userId: string, options: any = {}) {
    let query = supabase.from("notifications").select("*").eq("user_id", userId)

    if (options.unreadOnly) query = query.eq("is_read", false)
    if (options.limit) query = query.limit(options.limit)

    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async getNotification(notificationId: string) {
    const { data, error } = await supabase.from("notifications").select("*").eq("id", notificationId).single()
    if (error) throw error
    return data
  },

  async createNotification(notificationData: any) {
    const { data, error } = await supabase.from("notifications").insert(notificationData).select().single()
    if (error) throw error
    return data
  },

  async updateNotification(notificationId: string, updates: any) {
    const { data, error } = await supabase
      .from("notifications")
      .update(updates)
      .eq("id", notificationId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async markAllNotificationsRead(userId: string) {
    const { count, error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date() })
      .eq("user_id", userId)
      .eq("is_read", false)
    if (error) throw error
    return count
  },

  // Template operations
  async getComplianceTemplates(filters: any = {}) {
    let query = supabase.from("compliance_templates").select("*")

    if (filters.category) query = query.eq("category", filters.category)
    if (filters.businessType) query = query.eq("business_type", filters.businessType)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getAutomationTemplates(filters: any = {}) {
    let query = supabase.from("automation_templates").select("*")

    if (filters.category) query = query.eq("category", filters.category)
    if (filters.businessType) query = query.eq("business_type", filters.businessType)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async createAutomationTemplate(templateData: any) {
    const { data, error } = await supabase.from("automation_templates").insert(templateData).select().single()
    if (error) throw error
    return data
  },

  // Workflow operations
  async getUserWorkflows(userId: string, filters: any = {}) {
    let query = supabase.from("workflows").select("*").eq("user_id", userId)

    if (filters.businessId) query = query.eq("business_id", filters.businessId)
    if (filters.status) query = query.eq("status", filters.status)

    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) throw error
    return data
  },

  async createWorkflow(workflowData: any) {
    const { data, error } = await supabase.from("workflows").insert(workflowData).select().single()
    if (error) throw error
    return data
  },

  // Reporting operations
  async generateComplianceReport(userId: string, options: any = {}) {
    // This would generate compliance reports based on user data
    const compliance = await this.getUserCompliance(userId)
    const tasks = await this.getComplianceTasks(userId, { businessId: options.businessId })

    return {
      summary: {
        totalItems: compliance.length,
        completedItems: compliance.filter((item: any) => item.status === "completed").length,
        pendingItems: compliance.filter((item: any) => item.status === "pending").length,
        overdueItems: compliance.filter(
          (item: any) => item.due_date && new Date(item.due_date) < new Date() && item.status !== "completed",
        ).length,
      },
      tasks: {
        total: tasks.length,
        completed: tasks.filter((task: any) => task.status === "completed").length,
        pending: tasks.filter((task: any) => task.status === "pending").length,
      },
      compliance,
      tasks,
    }
  },

  async createComplianceReport(reportData: any) {
    const { data, error } = await supabase.from("compliance_reports").insert(reportData).select().single()
    if (error) throw error
    return data
  },

  async updateComplianceReport(reportId: string, updates: any) {
    const { data, error } = await supabase
      .from("compliance_reports")
      .update(updates)
      .eq("id", reportId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getUpcomingComplianceDeadlines(userId: string, options: any = {}) {
    const daysAhead = options.daysAhead || 30
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    let query = supabase
      .from("compliance")
      .select("*")
      .eq("user_id", userId)
      .not("due_date", "is", null)
      .lte("due_date", futureDate.toISOString())
      .gte("due_date", new Date().toISOString())

    if (options.businessId) query = query.eq("business_id", options.businessId)

    const { data, error } = await query.order("due_date", { ascending: true })
    if (error) throw error
    return data
  },

  async applyComplianceTemplate(userId: string, options: any) {
    const template = await supabase.from("compliance_templates").select("*").eq("id", options.templateId).single()
    if (!template.data) throw new Error("Template not found")

    const items = template.data.items || []
    const createdItems = []

    for (const item of items) {
      const complianceItem = await this.createComplianceItem({
        userId,
        businessId: options.businessId,
        complianceType: item.type,
        status: "pending",
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
        notes: item.notes || "",
        ...options.customizations,
      })
      createdItems.push(complianceItem)
    }

    return createdItems
  },
}
