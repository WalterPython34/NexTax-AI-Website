import { z } from "zod"

// User schema
export const insertUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string().optional(),
  subscriptionTier: z.enum(["free", "starter", "professional", "enterprise"]).default("free"),
  stripeCustomerId: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type InsertUser = z.infer<typeof insertUserSchema>

// Business Profile schema
export const insertBusinessProfileSchema = z.object({
  userId: z.string(),
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.enum(["llc", "corporation", "s_corp", "partnership", "sole_proprietorship"]),
  industry: z.string().min(1, "Industry is required"),
  state: z.string().min(2, "State is required"),
  description: z.string().optional(),
  expectedRevenue: z.number().optional(),
  numberOfEmployees: z.number().optional(),
  businessAddress: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>

// Document schema
export const insertDocumentSchema = z.object({
  userId: z.string(),
  businessId: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  documentType: z.enum([
    "operating_agreement",
    "bylaws",
    "articles",
    "chart_of_accounts",
    "expense_tracker",
    "business_plan",
    "other",
  ]),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type InsertDocument = z.infer<typeof insertDocumentSchema>

// Conversation schema
export const insertConversationSchema = z.object({
  userId: z.string(),
  businessId: z.string().optional(),
  title: z.string().default("New Conversation"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type InsertConversation = z.infer<typeof insertConversationSchema>

// Message schema
export const insertMessageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Content is required"),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date().default(() => new Date()),
})

export type InsertMessage = z.infer<typeof insertMessageSchema>

// Progress Task schema
export const insertProgressTaskSchema = z.object({
  userId: z.string(),
  businessId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["formation", "compliance", "tax", "legal", "operational"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]).default("pending"),
  dueDate: z.date().optional(),
  completedAt: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type InsertProgressTask = z.infer<typeof insertProgressTaskSchema>

// Usage Tracking schema
export const insertUsageSchema = z.object({
  userId: z.string(),
  month: z.string(), // YYYY-MM format
  messageCount: z.number().default(0),
  documentCount: z.number().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type InsertUsage = z.infer<typeof insertUsageSchema>

// Compliance Item schema
export const insertComplianceItemSchema = z.object({
  userId: z.string(),
  businessId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["tax_filing", "license_renewal", "annual_report", "permit", "registration", "other"]),
  status: z.enum(["upcoming", "due_soon", "overdue", "completed"]).default("upcoming"),
  dueDate: z.date(),
  completedAt: z.date().optional(),
  reminderSent: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
})

export type InsertComplianceItem = z.infer<typeof insertComplianceItemSchema>
