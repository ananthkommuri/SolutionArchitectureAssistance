import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateArchitectureRecommendation, optimizeArchitecture } from "./ai-service";
import { generatePricingBreakdown } from "./aws-pricing";
import { generateCloudFormationTemplate, generateTerraformTemplate } from "./cloudformation";
import { insertChatSessionSchema, insertMessageSchema, insertArchitectureSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create a demo user for this session
  const demoUser = await storage.createUser({
    username: "demo_user",
    password: "demo_password"
  });

  // Get all chat sessions for the demo user
  app.get("/api/chat-sessions", async (req, res) => {
    try {
      const sessions = await storage.getChatSessionsByUserId(demoUser.id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  // Create a new chat session
  app.post("/api/chat-sessions", async (req, res) => {
    try {
      const { title } = req.body;
      const session = await storage.createChatSession({
        userId: demoUser.id,
        title: title || "New Architecture Discussion"
      });
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Get messages for a chat session
  app.get("/api/chat-sessions/:id/messages", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const messages = await storage.getMessagesByChatId(chatId);
      
      // Enrich messages with architecture data
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          if (message.role === "assistant") {
            const architecture = await storage.getArchitectureByMessageId(message.id);
            return { ...message, architecture };
          }
          return message;
        })
      );

      res.json(enrichedMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a message and get AI response
  app.post("/api/chat-sessions/:id/messages", async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      // Save user message
      const userMessage = await storage.createMessage({
        chatSessionId: chatId,
        role: "user",
        content: content.trim()
      });

      // Get conversation history for context
      const previousMessages = await storage.getMessagesByChatId(chatId);
      const conversationHistory = previousMessages
        .slice(-10) // Last 10 messages for context
        .map(msg => ({ role: msg.role, content: msg.content }));

      // Generate AI response
      const recommendation = await generateArchitectureRecommendation(
        content,
        conversationHistory
      );

      // Create response content
      const responseContent = `Based on your requirements, I recommend the following AWS architecture:

**Architecture Overview:**
${recommendation.architecture.tiers.map(tier => 
  `• **${tier.name}**: ${tier.components.join(", ")}`
).join("\n")}

**Services and Pricing:**
${recommendation.services.map(service => 
  `• **${service.name}**: $${service.monthlyCost}/month - ${service.description}`
).join("\n")}

**Total Estimated Cost**: $${recommendation.totalMonthlyCost}/month

**Optimization Opportunities:**
${recommendation.optimizations.map(opt => 
  `• **${opt.type}**: ${opt.description} (${opt.savings}% savings)`
).join("\n")}`;

      // Save AI message
      const aiMessage = await storage.createMessage({
        chatSessionId: chatId,
        role: "assistant",
        content: responseContent,
        metadata: { hasArchitecture: true }
      });

      // Save architecture data
      const architecture = await storage.createArchitecture({
        messageId: aiMessage.id,
        services: recommendation.services,
        totalCost: Math.round(recommendation.totalMonthlyCost * 100), // Store in cents
        cloudFormationTemplate: recommendation.cloudFormationTemplate,
        diagram: recommendation.architecture
      });

      // Update chat session title if it's the first message
      const allMessages = await storage.getMessagesByChatId(chatId);
      if (allMessages.length === 2) { // First user message + first AI response
        const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        await storage.updateChatSession(chatId, { title });
      }

      res.json({ 
        userMessage, 
        aiMessage: { ...aiMessage, architecture }
      });
    } catch (error) {
      console.error("Error in chat message:", error);
      res.status(500).json({ error: `Failed to process message: ${error.message}` });
    }
  });

  // Optimize an existing architecture
  app.post("/api/architectures/:id/optimize", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { goals } = req.body;

      const existingArchitecture = await storage.getArchitectureByMessageId(messageId);
      if (!existingArchitecture) {
        return res.status(404).json({ error: "Architecture not found" });
      }

      const currentRecommendation = {
        services: existingArchitecture.services as any[],
        totalMonthlyCost: existingArchitecture.totalCost / 100,
        architecture: existingArchitecture.diagram as any,
        optimizations: [],
        cloudFormationTemplate: existingArchitecture.cloudFormationTemplate || ""
      };

      const optimizedRecommendation = await optimizeArchitecture(
        currentRecommendation,
        goals || "Reduce costs while maintaining performance"
      );

      res.json(optimizedRecommendation);
    } catch (error) {
      console.error("Error optimizing architecture:", error);
      res.status(500).json({ error: `Failed to optimize architecture: ${error.message}` });
    }
  });

  // Download CloudFormation template
  app.get("/api/architectures/:id/cloudformation", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const architecture = await storage.getArchitectureByMessageId(messageId);
      
      if (!architecture) {
        return res.status(404).json({ error: "Architecture not found" });
      }

      let template = architecture.cloudFormationTemplate;
      
      if (!template) {
        // Generate template if not exists
        const recommendation = {
          services: architecture.services as any[],
          totalMonthlyCost: architecture.totalCost / 100,
          architecture: architecture.diagram as any,
          optimizations: [],
          cloudFormationTemplate: ""
        };
        template = generateCloudFormationTemplate(recommendation);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="architecture-template.json"');
      res.send(template);
    } catch (error) {
      console.error("Error downloading CloudFormation template:", error);
      res.status(500).json({ error: "Failed to download CloudFormation template" });
    }
  });

  // Export pricing breakdown as CSV
  app.get("/api/architectures/:id/pricing-csv", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const architecture = await storage.getArchitectureByMessageId(messageId);
      
      if (!architecture) {
        return res.status(404).json({ error: "Architecture not found" });
      }

      const services = architecture.services as any[];
      const { breakdown } = generatePricingBreakdown(services);

      // Generate CSV content
      const csvHeader = "Service,Monthly Cost (USD),Description\n";
      const csvRows = breakdown.map(item => 
        `"${item.service}","$${item.cost}","${item.details}"`
      ).join("\n");
      const csvTotal = `\n"Total","$${architecture.totalCost / 100}","Total monthly cost"`;
      
      const csvContent = csvHeader + csvRows + csvTotal;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="aws-pricing-breakdown.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting pricing CSV:", error);
      res.status(500).json({ error: "Failed to export pricing breakdown" });
    }
  });

  // Get Terraform template
  app.get("/api/architectures/:id/terraform", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const architecture = await storage.getArchitectureByMessageId(messageId);
      
      if (!architecture) {
        return res.status(404).json({ error: "Architecture not found" });
      }

      const recommendation = {
        services: architecture.services as any[],
        totalMonthlyCost: architecture.totalCost / 100,
        architecture: architecture.diagram as any,
        optimizations: [],
        cloudFormationTemplate: ""
      };

      const terraformTemplate = generateTerraformTemplate(recommendation);

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="main.tf"');
      res.send(terraformTemplate);
    } catch (error) {
      console.error("Error generating Terraform template:", error);
      res.status(500).json({ error: "Failed to generate Terraform template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
