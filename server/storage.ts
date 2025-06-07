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
import { db } from "./db";
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
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session || undefined;
  }

  async getChatSessionsByUserId(userId: number): Promise<ChatSession[]> {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(chatSessions.updatedAt);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const [session] = await db
      .insert(chatSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const [session] = await db
      .update(chatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatSessions.id, id))
      .returning();
    return session || undefined;
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatSessionId, chatId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
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
    const [architecture] = await db
      .select()
      .from(architectures)
      .where(eq(architectures.messageId, messageId));
    return architecture || undefined;
  }

  async createArchitecture(insertArchitecture: InsertArchitecture): Promise<Architecture> {
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

// Memory storage implementation for deployments without database access
export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private chatSessions: ChatSession[] = [];
  private messages: Message[] = [];
  private architectures: Architecture[] = [];
  private nextUserId = 1;
  private nextChatId = 1;
  private nextMessageId = 1;
  private nextArchId = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      username: insertUser.username,
      password: insertUser.password
    };
    this.users.push(user);
    return user;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    return this.chatSessions.find(s => s.id === id);
  }

  async getChatSessionsByUserId(userId: number): Promise<ChatSession[]> {
    return this.chatSessions.filter(s => s.userId === userId);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const session: ChatSession = {
      id: this.nextChatId++,
      userId: insertSession.userId,
      title: insertSession.title,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chatSessions.push(session);
    return session;
  }

  async updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const index = this.chatSessions.findIndex(s => s.id === id);
    if (index === -1) return undefined;
    
    this.chatSessions[index] = { 
      ...this.chatSessions[index], 
      ...updates, 
      updatedAt: new Date() 
    };
    return this.chatSessions[index];
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    return this.messages.filter(m => m.chatSessionId === chatId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.nextMessageId++,
      chatSessionId: insertMessage.chatSessionId,
      role: insertMessage.role,
      content: insertMessage.content,
      metadata: insertMessage.metadata,
      createdAt: new Date()
    };
    this.messages.push(message);
    return message;
  }

  async getArchitectureByMessageId(messageId: number): Promise<Architecture | undefined> {
    return this.architectures.find(a => a.messageId === messageId);
  }

  async createArchitecture(insertArchitecture: InsertArchitecture): Promise<Architecture> {
    const architecture: Architecture = {
      id: this.nextArchId++,
      messageId: insertArchitecture.messageId,
      services: insertArchitecture.services,
      totalCost: insertArchitecture.totalCost,
      cloudFormationTemplate: insertArchitecture.cloudFormationTemplate ?? null,
      diagram: insertArchitecture.diagram,
      createdAt: new Date()
    };
    this.architectures.push(architecture);
    return architecture;
  }
}

// Use database storage if available, otherwise fall back to memory storage
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemoryStorage();
