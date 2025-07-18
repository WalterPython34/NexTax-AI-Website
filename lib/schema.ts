import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  state: text("state").notNull(),
  industry: text("industry"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  documentType: text("document_type").notNull(),
  title: text("title").notNull(),
  content: jsonb("content"),
  status: text("status").default("draft"), // 'draft' | 'completed' | 'reviewed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const complianceTasks = pgTable("compliance_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  taskName: text("task_name").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: text("status").default("pending"), // 'pending' | 'in-progress' | 'completed' | 'overdue'
  priority: text("priority").default("medium"), // 'low' | 'medium' | 'high'
  category: text("category"), // 'federal' | 'state' | 'local'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const progressTasks = pgTable("progress_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  businessProfileId: uuid("business_profile_id").references(() => businessProfiles.id),
  taskName: text("task_name").notNull(),
  description: text("description"),
  phase: text("phase").notNull(), // 'Legal Phase' | 'Financial Phase' | 'Compliance Phase'
  completed: boolean("completed").default(false),
  completedDate: timestamp("completed_date"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})
