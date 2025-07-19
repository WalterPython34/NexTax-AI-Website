import { pgTable, text, timestamp, uuid, integer, jsonb, varchar } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Business profiles table
export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }),
  state: varchar("state", { length: 50 }),
  industry: varchar("industry", { length: 100 }),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Documents table
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 50 }).default("draft"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// AI usage tracking
export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  actionType: varchar("action_type", { length: 100 }).notNull(),
  count: integer("count").default(1),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
})

// Conversations table
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
})

// Compliance tasks table
export const complianceTasks = pgTable("compliance_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: varchar("status", { length: 50 }).default("pending"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  category: varchar("category", { length: 100 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Progress tracking table
export const progressTracking = pgTable("progress_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  category: varchar("category", { length: 100 }).notNull(),
  taskName: varchar("task_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("not_started"),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  businessProfiles: many(businessProfiles),
  documents: many(documents),
  conversations: many(conversations),
  aiUsage: many(aiUsage),
  complianceTasks: many(complianceTasks),
  progressTracking: many(progressTracking),
}))

export const businessProfilesRelations = relations(businessProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [businessProfiles.userId],
    references: [users.id],
  }),
  documents: many(documents),
  complianceTasks: many(complianceTasks),
  progressTracking: many(progressTracking),
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  businessProfile: one(businessProfiles, {
    fields: [documents.businessProfileId],
    references: [businessProfiles.id],
  }),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}))

