import { pgTable, text, timestamp, integer, jsonb, uuid } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  subscriptionStatus: text("subscription_status").default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  type: text("type"),
  state: text("state"),
  industry: text("industry"),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  title: text("title").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  status: text("status").default("draft"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  title: text("title"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  actionType: text("action_type").notNull(),
  count: integer("count").default(1),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const complianceTasks = pgTable("compliance_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: text("status").default("pending"),
  priority: text("priority").default("medium"),
  category: text("category"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const progressTracking = pgTable("progress_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  category: text("category").notNull(),
  taskName: text("task_name").notNull(),
  status: text("status").default("not_started"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Create insert schemas
export const insertBusinessProfileSchema = createInsertSchema(businessProfiles)
export const insertUserSchema = createInsertSchema(users)
export const insertDocumentSchema = createInsertSchema(documents)
export const insertConversationSchema = createInsertSchema(conversations)
export const insertMessageSchema = createInsertSchema(messages)
export const insertAiUsageSchema = createInsertSchema(aiUsage)
export const insertComplianceTaskSchema = createInsertSchema(complianceTasks)
export const insertProgressTrackingSchema = createInsertSchema(progressTracking)
