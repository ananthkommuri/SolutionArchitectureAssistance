import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { ArchitectureRecommendation } from "@shared/schema";

// the newest Anthropic model is "claude-3-5-sonnet-20241022" which was released October 22, 2024

function createBedrockClient() {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.");
  }

  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  });
}

async function invokeClaude(messages: any[]): Promise<string> {
  // Format messages for Claude
  const systemMessage = messages.find(m => m.role === "system");
  const conversationMessages = messages.filter(m => m.role !== "system");
  
  const claudeMessages = conversationMessages.map(msg => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.content
  }));

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4000,
    system: systemMessage?.content || "",
    messages: claudeMessages,
    temperature: 0.7
  };

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    body: JSON.stringify(requestBody),
    contentType: "application/json",
    accept: "application/json"
  });

  try {
    const bedrock = createBedrockClient();
    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
      return responseBody.content[0].text;
    }
    
    throw new Error("Invalid response format from Claude");
  } catch (error) {
    console.error("Error calling Claude via Bedrock:", error);
    throw new Error(`Failed to call Claude: ${(error as Error).message}`);
  }
}

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

Base your recommendations on AWS best practices, Well-Architected Framework principles, and realistic pricing data. Return only valid JSON, no additional text.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userRequirements }
  ];

  try {
    const content = await invokeClaude(messages);
    
    if (!content) {
      throw new Error("No response from Claude");
    }

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonContent = jsonMatch ? jsonMatch[0] : content;
    
    const recommendation = JSON.parse(jsonContent) as ArchitectureRecommendation;
    
    // Validate the response structure
    if (!recommendation.services || !recommendation.totalMonthlyCost || !recommendation.architecture) {
      throw new Error("Invalid response structure from AI");
    }

    return recommendation;
  } catch (error) {
    console.error("Error generating architecture recommendation:", error);
    throw new Error(`Failed to generate architecture recommendation: ${(error as Error).message}`);
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
Return the same JSON format as the original architecture. Return only valid JSON, no additional text.`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Please optimize this architecture based on the goals provided." }
  ];

  try {
    const content = await invokeClaude(messages);
    
    if (!content) {
      throw new Error("No response from Claude");
    }

    // Extract JSON from response (in case there's extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonContent = jsonMatch ? jsonMatch[0] : content;

    return JSON.parse(jsonContent) as ArchitectureRecommendation;
  } catch (error) {
    console.error("Error optimizing architecture:", error);
    throw new Error(`Failed to optimize architecture: ${(error as Error).message}`);
  }
}
