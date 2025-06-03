import { 
  users, 
  chatSessions, 
  messages, 
  architectures,
  type User, 
  type InsertUser,
  type ChatSession,
  type InsertChatSession,
  type Message,
  type InsertMessage,
  type Architecture,
  type InsertArchitecture
} from "@shared/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat session methods
  getChatSession(id: number): Promise<ChatSession | undefined>;
  getChatSessionsByUserId(userId: number): Promise<ChatSession[]>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;
  
  // Message methods
  getMessagesByChatId(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Architecture methods
  getArchitectureByMessageId(messageId: number): Promise<Architecture | undefined>;
  createArchitecture(architecture: InsertArchitecture): Promise<Architecture>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = getDb();
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const db = getDb();
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getChatSessionsByUserId(userId: number): Promise<ChatSession[]> {
    const db = getDb();
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(chatSessions.updatedAt);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const db = getDb();
    const [session] = await db
      .insert(chatSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const db = getDb();
    const [session] = await db
      .update(chatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatSessions.id, id))
      .returning();
    return session || undefined;
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    const db = getDb();
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatSessionId, chatId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const db = getDb();
    const [message] = await db
      .insert(messages)
      .values({
        ...insertMessage,
        metadata: insertMessage.metadata || null
      })
      .returning();
    return message;
  }

  async getArchitectureByMessageId(messageId: number): Promise<Architecture | undefined> {
    const db = getDb();
    const [architecture] = await db
      .select()
      .from(architectures)
      .where(eq(architectures.messageId, messageId));
    return architecture || undefined;
  }

  async createArchitecture(insertArchitecture: InsertArchitecture): Promise<Architecture> {
    const db = getDb();
    const [architecture] = await db
      .insert(architectures)
      .values({
        ...insertArchitecture,
        cloudFormationTemplate: insertArchitecture.cloudFormationTemplate || null
      })
      .returning();
    return architecture;
  }
}

export const storage = new DatabaseStorage();
