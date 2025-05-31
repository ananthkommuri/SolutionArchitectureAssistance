import OpenAI from "openai";
import type { ArchitectureRecommendation } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function generateArchitectureRecommendation(
  userRequirements: string,
  conversationHistory: { role: string; content: string }[] = []
): Promise<ArchitectureRecommendation> {
  const systemPrompt = `You are an AWS Solutions Architect AI assistant. Your role is to:
1. Analyze customer requirements for cloud infrastructure
2. Recommend appropriate AWS services and architectures
3. Provide accurate cost estimates
4. Generate CloudFormation templates
5. Suggest optimizations for cost and performance

When responding, always provide your recommendations in the following JSON format:
{
  "services": [
    {
      "name": "service name",
      "type": "service category",
      "monthlyCost": number (in USD),
      "description": "what this service does in the architecture",
      "configuration": {
        "instanceType": "t3.large",
        "storage": "100GB",
        "region": "us-east-1"
      }
    }
  ],
  "totalMonthlyCost": number,
  "architecture": {
    "tiers": [
      {
        "name": "Web Tier",
        "components": ["Application Load Balancer", "Auto Scaling Group", "EC2 instances"]
      }
    ]
  },
  "optimizations": [
    {
      "type": "Reserved Instances",
      "description": "Use reserved instances for predictable workloads",
      "savings": number (percentage)
    }
  ],
  "cloudFormationTemplate": "YAML CloudFormation template as string"
}

Base your recommendations on AWS best practices, Well-Architected Framework principles, and realistic pricing data.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userRequirements }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const recommendation = JSON.parse(content) as ArchitectureRecommendation;
    
    // Validate the response structure
    if (!recommendation.services || !recommendation.totalMonthlyCost || !recommendation.architecture) {
      throw new Error("Invalid response structure from AI");
    }

    return recommendation;
  } catch (error) {
    console.error("Error generating architecture recommendation:", error);
    throw new Error(`Failed to generate architecture recommendation: ${error.message}`);
  }
}

export async function optimizeArchitecture(
  currentArchitecture: ArchitectureRecommendation,
  optimizationGoals: string
): Promise<ArchitectureRecommendation> {
  const systemPrompt = `You are optimizing an existing AWS architecture. 
Current architecture: ${JSON.stringify(currentArchitecture)}
Optimization goals: ${optimizationGoals}

Provide an optimized version that reduces costs while maintaining or improving performance and reliability.
Return the same JSON format as the original architecture.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: systemPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content) as ArchitectureRecommendation;
  } catch (error) {
    console.error("Error optimizing architecture:", error);
    throw new Error(`Failed to optimize architecture: ${error.message}`);
  }
}
