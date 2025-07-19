import { pgTable, text, varchar, timestamp, jsonb, index, serial, integer, boolean } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import type { z } from "zod"

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  subscriptionTier: varchar("subscription_tier").default("free"), // free, pro, premium
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// AI Chat usage tracking table
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    month: varchar("month").notNull(), // Format: YYYY-MM
    messageCount: integer("message_count").default(0),
    tokenCount: integer("token_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("idx_ai_usage_user_month").on(table.userId, table.month)],
)

// Business profiles table
export const businessProfiles = pgTable("business_profiles", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  businessName: varchar("business_name"),
  businessType: varchar("business_type"),
  industry: varchar("industry"),
  state: varchar("state"),
  description: text("description"),
  entityType: varchar("entity_type"), // LLC, Corporation, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Chat conversations table
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  businessId: varchar("business_id").references(() => businessProfiles.id),
  title: varchar("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Chat messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().notNull(),
  conversationId: varchar("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing additional AI response data
  createdAt: timestamp("created_at").defaultNow(),
})

// Progress tracking table
export const progressTasks = pgTable("progress_tasks", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  businessId: varchar("business_id").references(() => businessProfiles.id),
  category: varchar("category").notNull(), // 'foundation', 'legal', 'financial', etc.
  taskName: varchar("task_name").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed'
  orderIndex: integer("order_index").default(0),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Generated documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  businessId: varchar("business_id").references(() => businessProfiles.id),
  documentType: varchar("document_type").notNull(), // 'operating_agreement', 'ss4_form', etc.
  title: varchar("title").notNull(),
  content: text("content"), // HTML or markdown content
  status: varchar("status").notNull().default("generated"), // 'draft', 'generated', 'downloaded'
  metadata: jsonb("metadata"), // Document-specific data
  fileUrl: varchar("file_url"), // If stored as file
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Business compliance profile
export const businessCompliance = pgTable("business_compliance", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  businessId: varchar("business_id").references(() => businessProfiles.id),
  stateOfFormation: varchar("state_of_formation"),
  fiscalYearEnd: varchar("fiscal_year_end").default("12"), // Month number
  entityType: varchar("entity_type"), // LLC, Corp, etc.
  businessActivities: jsonb("business_activities"), // Array of activities like retail, consulting
  hasEmployees: boolean("has_employees").default(false),
  hasRetailSales: boolean("has_retail_sales").default(false),
  industry: varchar("industry"), // NAICS industry code or description
  emailRemindersEnabled: boolean("email_reminders_enabled").default(false), // Pro/Premium feature
  reminderDaysBefore: integer("reminder_days_before").default(30), // Days before due date
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Dynamic compliance tasks
export const complianceTasks = pgTable("compliance_tasks", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  complianceId: varchar("compliance_id").references(() => businessCompliance.id),
  category: varchar("category").notNull(), // 'tax', 'legal', 'employment', 'licensing'
  taskName: varchar("task_name").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: varchar("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'overdue'
  priority: varchar("priority").default("medium"), // 'low', 'medium', 'high'
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern"), // 'monthly', 'quarterly', 'annually'
  autoGenerated: boolean("auto_generated").default(false),
  linkedDocumentId: varchar("linked_document_id").references(() => documents.id),
  stateSpecific: boolean("state_specific").default(false),
  reminderSent: boolean("reminder_sent").default(false),
  lastReminderSent: timestamp("last_reminder_sent"), // Track when last reminder was sent
  nextDueDate: timestamp("next_due_date"), // For recurring tasks - next occurrence
  recurringFrequency: varchar("recurring_frequency"), // 'annual', 'quarterly', 'monthly'
  originalDueDate: timestamp("original_due_date"), // Store original due date for rollover calculation
  metadata: jsonb("metadata"), // Additional task-specific data
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Operating Agreement data table
export const operatingAgreements = pgTable("operating_agreements", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  llcName: varchar("llc_name").notNull(),
  agreementDate: varchar("agreement_date").notNull(),
  stateOfFormation: varchar("state_of_formation").notNull(),
  formationDate: varchar("formation_date").notNull(),
  registeredOfficeAddress: text("registered_office_address").notNull(),
  registeredAgentName: varchar("registered_agent_name").notNull(),
  members: jsonb("members").notNull(), // Array of member objects
  managementStructure: varchar("management_structure").notNull(), // "Member-managed" or "Manager-managed"
  financialInstitution: varchar("financial_institution"),
  authorizedSignatories: jsonb("authorized_signatories").notNull(), // Array of names
  taxElection: varchar("tax_election").notNull(), // "Partnership", "S-Corp", "C-Corp"
  valuationMethod: varchar("valuation_method").notNull(),
  dissolutionTerms: text("dissolution_terms").notNull(),
  generatedDocument: text("generated_document"), // AI-generated document content
  status: varchar("status").default("draft"), // "draft", "generated", "finalized"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true, updatedAt: true })
export const insertBusinessProfileSchema = createInsertSchema(businessProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true })
export const insertProgressTaskSchema = createInsertSchema(progressTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true })
export const insertBusinessComplianceSchema = createInsertSchema(businessCompliance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertComplianceTaskSchema = createInsertSchema(complianceTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const insertOperatingAgreementSchema = createInsertSchema(operatingAgreements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>
export type User = typeof users.$inferSelect
export type InsertBusinessProfile = z.infer<typeof insertBusinessProfileSchema>
export type BusinessProfile = typeof businessProfiles.$inferSelect
export type InsertConversation = z.infer<typeof insertConversationSchema>
export type Conversation = typeof conversations.$inferSelect
export type InsertMessage = z.infer<typeof insertMessageSchema>
export type Message = typeof messages.$inferSelect
export type InsertProgressTask = z.infer<typeof insertProgressTaskSchema>
export type ProgressTask = typeof progressTasks.$inferSelect
export type InsertDocument = z.infer<typeof insertDocumentSchema>
export type Document = typeof documents.$inferSelect
export type InsertBusinessCompliance = z.infer<typeof insertBusinessComplianceSchema>
export type BusinessCompliance = typeof businessCompliance.$inferSelect
export type InsertComplianceTask = z.infer<typeof insertComplianceTaskSchema>
export type ComplianceTask = typeof complianceTasks.$inferSelect
export type InsertOperatingAgreement = z.infer<typeof insertOperatingAgreementSchema>
export type OperatingAgreement = typeof operatingAgreements.$inferSelect

// AI Usage schemas and types
export const insertAiUsageSchema = createInsertSchema(aiUsage)
export type InsertAiUsage = z.infer<typeof insertAiUsageSchema>
export type AiUsage = typeof aiUsage.$inferSelect
