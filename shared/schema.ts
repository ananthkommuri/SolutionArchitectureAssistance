import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatSessionId: integer("chat_session_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing architecture data, pricing, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const architectures = pgTable("architectures", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  services: jsonb("services").notNull(), // AWS services used
  totalCost: integer("total_cost").notNull(), // Monthly cost in cents
  cloudFormationTemplate: text("cloud_formation_template"),
  diagram: jsonb("diagram"), // Diagram data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertArchitectureSchema = createInsertSchema(architectures).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Architecture = typeof architectures.$inferSelect;
export type InsertArchitecture = z.infer<typeof insertArchitectureSchema>;

export interface ArchitectureRecommendation {
  services: {
    name: string;
    type: string;
    monthlyCost: number;
    description: string;
    configuration: Record<string, any>;
  }[];
  totalMonthlyCost: number;
  architecture: {
    tiers: {
      name: string;
      components: string[];
    }[];
  };
  optimizations: {
    type: string;
    description: string;
    savings: number;
  }[];
  cloudFormationTemplate: string;
}
