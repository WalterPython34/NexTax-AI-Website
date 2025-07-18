import { z } from "zod"

// User schemas
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().min(1),
  subscription_tier: z.enum(["free", "basic", "premium", "enterprise"]).default("free"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const BusinessProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_name: z.string().min(1),
  business_type: z.enum(["LLC", "Corporation", "Partnership", "Sole Proprietorship"]),
  state: z.string().min(2).max(2),
  industry: z.string().min(1),
  formation_date: z.string().datetime().optional(),
  ein: z.string().optional(),
  address: z
    .object({
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    })
    .optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Document schemas
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_profile_id: z.string().uuid().optional(),
  title: z.string().min(1),
  type: z.enum(["operating_agreement", "bylaws", "articles", "contract", "other"]),
  content: z.string(),
  status: z.enum(["draft", "review", "final"]).default("draft"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const DocumentGenerationRequestSchema = z.object({
  type: z.enum(["operating_agreement", "bylaws", "articles", "contract"]),
  business_profile_id: z.string().uuid(),
  custom_requirements: z.string().optional(),
  template_options: z.record(z.any()).optional(),
})

// Chat schemas
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
})

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  type: z.enum(["general", "document_help", "compliance", "tax_advice"]).default("general"),
  status: z.enum(["active", "archived"]).default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Compliance schemas
export const ComplianceItemSchema = z.object({
  id: z.string().uuid(),
  business_profile_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string(),
  category: z.enum(["tax", "legal", "regulatory", "filing"]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  due_date: z.string().datetime().optional(),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]).default("pending"),
  requirements: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const TaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  business_profile_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["formation", "compliance", "tax", "legal", "other"]).default("other"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  due_date: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Usage tracking schemas
export const UsageRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  action_type: z.enum(["chat_message", "document_generated", "compliance_check", "ai_analysis"]),
  count: z.number().int().positive().default(1),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
})

// API request/response schemas
export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  conversation_id: z.string().uuid().optional(),
  context: z
    .object({
      business_profile_id: z.string().uuid().optional(),
      document_id: z.string().uuid().optional(),
    })
    .optional(),
})

export const QuickChatRequestSchema = z.object({
  question: z.string().min(1),
  context: z.enum(["general", "llc", "corporation", "tax", "compliance"]).default("general"),
})

// Export types
export type UserProfile = z.infer<typeof UserProfileSchema>
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>
export type Document = z.infer<typeof DocumentSchema>
export type DocumentGenerationRequest = z.infer<typeof DocumentGenerationRequestSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type Conversation = z.infer<typeof ConversationSchema>
export type ComplianceItem = z.infer<typeof ComplianceItemSchema>
export type Task = z.infer<typeof TaskSchema>
export type UsageRecord = z.infer<typeof UsageRecordSchema>
export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type QuickChatRequest = z.infer<typeof QuickChatRequestSchema>
